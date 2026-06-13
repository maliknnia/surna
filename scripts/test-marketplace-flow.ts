/**
 * End-to-end marketplace flow: signup → onboarding → browse → cart → checkout.
 * Run: npx tsx scripts/test-marketplace-flow.ts
 * Requires dev server at http://localhost:5000
 */
import { config } from "dotenv";
config();

const BASE = process.env.SURNA_TEST_URL || "http://127.0.0.1:5000";

type Jar = Map<string, string>;

function parseSetCookie(headers: string[]): Jar {
  const jar: Jar = new Map();
  for (const h of headers) {
    const part = h.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  return jar;
}

function cookieHeader(jar: Jar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function request(
  path: string,
  opts: { method?: string; body?: unknown; jar?: Jar; csrf?: string } = {},
): Promise<{ status: number; json: any; jar: Jar }> {
  const jar = opts.jar ?? new Map<string, string>();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.csrf) headers["x-csrf-token"] = opts.csrf;
  const cookie = cookieHeader(jar);
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });

  const setCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : res.headers.get("set-cookie")
      ? [res.headers.get("set-cookie")!]
      : [];
  for (const [k, v] of parseSetCookie(setCookies)) jar.set(k, v);

  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 300) };
    }
  }
  return { status: res.status, json, jar };
}

function assertStep(label: string, ok: boolean, detail?: string) {
  if (!ok) throw new Error(`${label} failed${detail ? `: ${detail}` : ""}`);
  console.log(`✓ ${label}`);
}

async function main() {
  const stamp = Date.now().toString(36);
  const email = `market.test.${stamp}@example.com`;
  const password = "TestPass123!";
  let jar: Jar = new Map();

  console.log(`\nMarketplace E2E @ ${BASE}\n`);

  // 1. Sign up (new fake account)
  let r = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: { email, password, firstName: "Market", lastName: "Tester" },
    jar,
  });
  jar = r.jar;
  assertStep("Sign up", r.status === 201, JSON.stringify(r.json));

  r = await request("/api/csrf-token", { jar });
  assertStep("CSRF token", r.status === 200 && r.json?.csrfToken, JSON.stringify(r.json));
  const csrf = r.json.csrfToken as string;

  // 2. Quick Start path (skip heavy onboarding)
  r = await request("/api/profile/path", {
    method: "POST",
    body: { profileType: "normal", skipSetup: true },
    jar,
    csrf,
  });
  assertStep("Profile path (Quick Start)", r.status === 200, JSON.stringify(r.json));

  // 3. Optional profile setup
  r = await request("/api/user/setup", {
    method: "PUT",
    body: {
      displayName: "Market Tester",
      sportsPreferences: ["Football", "Running"],
      location: "Dublin",
      skillLevel: "intermediate",
    },
    jar,
    csrf,
  });
  assertStep("User setup", r.status === 200 || r.status === 201, JSON.stringify(r.json));

  // 4. Browse marketplace (public)
  r = await request("/api/marketplace/products?limit=20", { jar });
  assertStep("List products", r.status === 200, JSON.stringify(r.json));
  const items = r.json?.items ?? [];
  assertStep("Catalog not empty", items.length > 0, `got ${items.length} items`);

  const product = items[0];
  const productId = product.id as string;
  console.log(`  → first product: ${product.title ?? product.name} (${productId})`);

  // 5. Product detail
  r = await request(`/api/marketplace/products/${productId}`, { jar });
  assertStep("Product detail", r.status === 200, JSON.stringify(r.json));

  // 6. Add to cart
  r = await request("/api/marketplace/cart/items", {
    method: "POST",
    body: { productId, qty: 1 },
    jar,
    csrf,
  });
  assertStep("Add to cart", r.status === 201, JSON.stringify(r.json));

  // 7. View cart
  r = await request("/api/marketplace/cart", { jar });
  assertStep("Get cart", r.status === 200, JSON.stringify(r.json));
  assertStep("Cart has items", (r.json?.items?.length ?? 0) > 0);

  // 8. Stub checkout (no Stripe)
  r = await request("/api/marketplace/checkout", { method: "POST", body: {}, jar, csrf });
  assertStep("Checkout", r.status === 201, JSON.stringify(r.json));

  // 9. Orders list
  r = await request("/api/marketplace/orders", { jar });
  assertStep("Orders after checkout", r.status === 200, JSON.stringify(r.json));
  assertStep("Order recorded", (r.json?.orders?.length ?? 0) > 0);

  // 10. Session user
  r = await request("/api/auth/user", { jar });
  assertStep("Auth session", r.status === 200 && r.json?.email === email, JSON.stringify(r.json));

  console.log(`\nDone — fake account ${email} completed signup → marketplace → checkout.\n`);
}

main().catch((err) => {
  console.error("\n✗", err.message || err);
  process.exit(1);
});
