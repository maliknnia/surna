// Derive thumb/medium variant URLs (and their modern WebP/AVIF siblings) from
// any URL the resize worker produced. The worker writes its outputs at
// deterministic sibling paths:
//
//   media/{id}_thumb.jpg   â† small JPEG (256w)
//   media/{id}_medium.jpg  â† large JPEG (1024w)
//   media/{id}_thumb.webp  / _thumb.avif
//   media/{id}_medium.webp / _medium.avif
//
// Because all variants are uploaded together and the media row is only
// flagged `ready` once they all upload, "this URL exists" implies the rest
// exist too. So given any one of those URLs we can reconstruct the others
// without an extra DB lookup.
//
// Returns `null` for inputs that don't match the worker pattern (avatars
// uploaded elsewhere, original/raw uploads, external screenshots, etc) so
// callers can decide whether to fall back to the raw URL.

const VARIANT_RE = /(_thumb|_medium)\.(jpg|jpeg|webp|avif)(\?.*)?$/i;

export interface ImageVariants {
  thumbUrl?: string;
  mediumUrl?: string;
  thumbWebpUrl?: string;
  mediumWebpUrl?: string;
  thumbAvifUrl?: string;
  mediumAvifUrl?: string;
}

export function deriveImageVariants(url: string | null | undefined): ImageVariants | null {
  if (!url) return null;
  if (!VARIANT_RE.test(url)) return null;
  const sub = (size: "thumb" | "medium", ext: "jpg" | "webp" | "avif") =>
    url.replace(VARIANT_RE, (_m, _size, _ext, query) => `_${size}.${ext}${query ?? ""}`);
  return {
    thumbUrl: sub("thumb", "jpg"),
    mediumUrl: sub("medium", "jpg"),
    thumbWebpUrl: sub("thumb", "webp"),
    mediumWebpUrl: sub("medium", "webp"),
    thumbAvifUrl: sub("thumb", "avif"),
    mediumAvifUrl: sub("medium", "avif"),
  };
}

// Merge explicit variant fields (from the `media` table) with any that can
// be derived from the supplied base URL. Explicit values always win; this
// lets callers pass DB columns first, then fall back to URL-pattern derivation.
export function mergeImageVariants(
  baseUrl: string | null | undefined,
  explicit?: Partial<ImageVariants> | null,
): ImageVariants {
  const derived = deriveImageVariants(baseUrl) ?? {};
  return {
    thumbUrl: explicit?.thumbUrl ?? derived.thumbUrl,
    mediumUrl: explicit?.mediumUrl ?? derived.mediumUrl,
    thumbWebpUrl: explicit?.thumbWebpUrl ?? derived.thumbWebpUrl,
    mediumWebpUrl: explicit?.mediumWebpUrl ?? derived.mediumWebpUrl,
    thumbAvifUrl: explicit?.thumbAvifUrl ?? derived.thumbAvifUrl,
    mediumAvifUrl: explicit?.mediumAvifUrl ?? derived.mediumAvifUrl,
  };
}
