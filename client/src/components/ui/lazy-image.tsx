import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ModernSources {
  /** WebP source URL — served first if the browser supports it. ~25-35% smaller than JPEG. */
  webp?: string;
  /** AVIF source URL — served first when present (smallest, ~50% smaller than JPEG). */
  avif?: string;
}

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Optional tiny placeholder (data URI or thumbnail URL) shown blurred until full image loads. */
  placeholder?: string;
  /** Wrapper className. */
  wrapperClassName?: string;
  /**
   * Modern-format URLs from the resize worker. When provided, the component
   * renders a <picture> element so AVIF/WebP-capable browsers download the
   * smaller variant and older browsers fall back to `src` (JPEG).
   */
  sources?: ModernSources;
}

/**
 * Defers the network request for offscreen images via native `loading="lazy"`
 * and `decoding="async"`, shows a blurred low-quality placeholder until the
 * real image finishes loading, and (when `sources` is provided) wraps the
 * `<img>` in a `<picture>` so AVIF/WebP-capable browsers fetch the smaller
 * modern variant. Drop-in for `<img>` on feed cards, profile avatars, and
 * map preview cards where image weight dominates the page payload.
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  className,
  wrapperClassName,
  sources,
  onLoad,
  ...rest
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // If the image is already cached when mounted (browser reuse, fast network),
  // the `load` event may have fired before the React listener attaches.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  // Order matters: AVIF first (smallest), then WebP, then the JPEG fallback
  // via the `<img src>`. The browser picks the first <source> it understands.
  const img = (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn(
        "h-full w-full object-cover transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
      {...rest}
    />
  );

  const hasModern = !!(sources?.avif || sources?.webp);

  return (
    <span className={cn("relative inline-block overflow-hidden", wrapperClassName)}>
      {placeholder && !loaded && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className={cn("absolute inset-0 h-full w-full object-cover blur-md scale-110", className)}
        />
      )}
      {hasModern ? (
        <picture>
          {sources?.avif && <source type="image/avif" srcSet={sources.avif} />}
          {sources?.webp && <source type="image/webp" srcSet={sources.webp} />}
          {img}
        </picture>
      ) : (
        img
      )}
    </span>
  );
}

export default LazyImage;
