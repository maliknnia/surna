// Helpers for opting an existing JPEG URL into the modern <picture> pipeline.
//
// Background: the resize worker (server/worker/media.worker.ts) writes its
// outputs at deterministic sibling paths:
//
//   media/{id}_thumb.jpg   ← JPEG fallback
//   media/{id}_thumb.webp  ← WebP variant (~30% smaller)
//   media/{id}_thumb.avif  ← AVIF variant (~50% smaller)
//
// Same suffix pattern for `_medium.jpg`. Because all three are written in a
// single Promise.all() and the media row is only flagged `ready` once they
// all upload, "this URL exists" implies "the modern variants exist too".
//
// IMPORTANT: browsers do NOT fall back to the JPEG `<img src>` when a
// `<source srcSet>` 404s — once they pick a `<source>`, they're committed.
// So we only derive sources for URLs we KNOW the worker produced (the
// `_thumb.jpg`/`_medium.jpg` filename pattern). Any other URL — user
// avatars uploaded elsewhere, external screenshots, etc — gets `undefined`,
// which makes <LazyImage> render a plain <img>.

const WORKER_VARIANT_RE = /(_thumb|_medium)\.(jpg|jpeg)(\?.*)?$/i;

export interface ModernSources {
  webp?: string;
  avif?: string;
}

/**
 * Returns AVIF/WebP sibling URLs for a worker-generated JPEG, or `undefined`
 * if the URL doesn't match the worker's known naming convention.
 */
export function deriveModernSources(url: string | null | undefined): ModernSources | undefined {
  if (!url) return undefined;
  if (!WORKER_VARIANT_RE.test(url)) return undefined;
  return {
    webp: url.replace(WORKER_VARIANT_RE, (_m, size, _ext, query) => `${size}.webp${query ?? ""}`),
    avif: url.replace(WORKER_VARIANT_RE, (_m, size, _ext, query) => `${size}.avif${query ?? ""}`),
  };
}

const MEDIUM_VARIANT_RE = /_medium\.(jpg|jpeg|webp|avif)(\?.*)?$/i;

/**
 * Returns the worker's tiny `_thumb.jpg` sibling for a `_medium.*` URL so the
 * `LazyImage` can render it as a blurred LQIP while the full image loads.
 * Returns `undefined` when the URL isn't a worker-generated medium variant.
 */
export function deriveLqipPlaceholder(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (!MEDIUM_VARIANT_RE.test(url)) return undefined;
  return url.replace(MEDIUM_VARIANT_RE, (_m, _ext, query) => `_thumb.jpg${query ?? ""}`);
}
