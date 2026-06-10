/**
 * CDN edge cache purge helper.
 *
 * Media URLs are served with `Cache-Control: public, max-age=31536000, immutable`,
 * so once an object has been fetched through the CDN it can sit on the edge for
 * up to a year. When media is deleted from S3 (user takedown, moderation
 * removal) we need to actively invalidate the edge copies so they stop being
 * served within seconds rather than waiting out the TTL.
 *
 * Configure via env:
 *   CDN_PROVIDER     "cloudflare" | "cloudfront" | "bunny" | "none" (default: "none")
 *   CDN_PURGE_TOKEN  API token / key for the provider
 *   CDN_ZONE_ID      Cloudflare zone id, CloudFront distribution id, or Bunny pull-zone id
 *
 * If no provider is configured this is a no-op so dev/test environments work
 * without any CDN credentials.
 */

type CdnProvider = "cloudflare" | "cloudfront" | "bunny" | "none";

function getProvider(): CdnProvider {
  const p = (process.env.CDN_PROVIDER || "none").toLowerCase();
  if (p === "cloudflare" || p === "cloudfront" || p === "bunny" || p === "none") {
    return p;
  }
  return "none";
}

export interface PurgeResult {
  provider: CdnProvider;
  purged: string[];
  skipped: boolean;
  error?: string;
}

async function purgeCloudflare(urls: string[], token: string, zoneId: string): Promise<void> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ files: urls }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`cloudflare purge failed: ${res.status} ${body}`);
  }
}

async function purgeBunny(urls: string[], token: string): Promise<void> {
  // Bunny purges one URL per call.
  await Promise.all(urls.map(async (u) => {
    const res = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(u)}`, {
      method: "POST",
      headers: { "AccessKey": token },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`bunny purge failed for ${u}: ${res.status} ${body}`);
    }
  }));
}

async function purgeCloudFront(urls: string[], token: string, distributionId: string): Promise<void> {
  // CloudFront's invalidation API requires a SigV4-signed request. Rather than
  // pull in the AWS SDK on the hot delete path, we expect operators using
  // CloudFront to expose a small lambda/api gateway in front of
  // CreateInvalidation and configure CDN_PURGE_TOKEN as that endpoint's
  // bearer token. The endpoint URL is read from CDN_PURGE_ENDPOINT.
  const endpoint = process.env.CDN_PURGE_ENDPOINT;
  if (!endpoint) {
    throw new Error("CDN_PURGE_ENDPOINT must be set when CDN_PROVIDER=cloudfront");
  }
  const paths = urls.map((u) => {
    try { return new URL(u).pathname; } catch { return u; }
  });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ distributionId, paths }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`cloudfront purge failed: ${res.status} ${body}`);
  }
}

/**
 * Purge a list of fully-qualified media URLs from the CDN edge.
 * Falsy URLs are filtered out so callers can pass record fields directly.
 * Returns a result object instead of throwing â€” a CDN purge failure should
 * never block the underlying S3/DB delete.
 */
export async function purgeMediaUrls(urls: Array<string | null | undefined>): Promise<PurgeResult> {
  const provider = getProvider();
  const clean = Array.from(new Set(urls.filter((u): u is string => !!u && /^https?:\/\//.test(u))));

  if (provider === "none" || clean.length === 0) {
    return { provider, purged: [], skipped: true };
  }

  const token = process.env.CDN_PURGE_TOKEN;
  const zoneId = process.env.CDN_ZONE_ID;
  // Bunny only needs the token; Cloudflare and CloudFront need both.
  const needsZone = provider !== "bunny";
  if (!token || (needsZone && !zoneId)) {
    const error = needsZone
      ? "CDN_PURGE_TOKEN and CDN_ZONE_ID must be set"
      : "CDN_PURGE_TOKEN must be set";
    // Warn loudly â€” fire-and-forget callers won't inspect the result, so a
    // misconfigured prod env would otherwise silently disable purging.
    console.warn("[cdn] purge skipped: misconfigured", { provider, error });
    return { provider, purged: [], skipped: true, error };
  }

  try {
    if (provider === "cloudflare") {
      await purgeCloudflare(clean, token, zoneId as string);
    } else if (provider === "bunny") {
      await purgeBunny(clean, token);
    } else if (provider === "cloudfront") {
      await purgeCloudFront(clean, token, zoneId as string);
    }
    return { provider, purged: clean, skipped: false };
  } catch (err: any) {
    console.error("[cdn] purge failed", { provider, urls: clean, error: err?.message });
    return { provider, purged: [], skipped: false, error: err?.message || String(err) };
  }
}
