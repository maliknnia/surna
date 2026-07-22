import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  extractDominantColor,
  extractEdgeColor,
  getCachedColor,
  getCachedEdgeColor,
} from "@/lib/extractColor";
import {
  buildImageEdgeGradient,
  buildNoImageRadialGlow,
  buildNoImageStripeTexture,
  buildTintCardBackground,
  noImageBottomFade,
  resolveCardScrim,
  resolveLightSurface,
  resolvePostCardTint,
  type PostCardContentKind,
} from "@/lib/postCardBackground";
import { getSportColor } from "@/lib/sportColors";
import { cn } from "@/lib/utils";

type PostCardMediaBackdropProps = {
  imageUrl?: string | null;
  sport?: string | null;
  contentKind?: PostCardContentKind | string | null;
  authorRole?: string | null;
  aspectRatio?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children?: ReactNode;
  clean?: boolean;
  showImage?: boolean;
  mediaSlot?: ReactNode;
  imageAlt?: string;
  onImageLoad?: () => void;
  imageClassName?: string;
  backgroundOverride?: string | null;
  /** Home portrait cards use a lighter wash so photos + tints stay visible. */
  variant?: "feed" | "home";
};

/**
 * Media area for home/feed cards: photo-matched fill when an image exists,
 * sport tint only as empty-state / loading fallback.
 */
export function PostCardMediaBackdrop({
  imageUrl,
  sport,
  contentKind,
  authorRole,
  aspectRatio = "4/3",
  className,
  style,
  onClick,
  children,
  showImage = true,
  mediaSlot,
  imageAlt = "",
  onImageLoad,
  imageClassName,
  backgroundOverride,
  clean = false,
  variant = "feed",
}: PostCardMediaBackdropProps) {
  const { theme } = useTheme();
  const mode = theme === "light" ? "light" : "dark";
  const tint = useMemo(
    () => resolvePostCardTint({ sport, contentKind, authorRole }),
    [sport, contentKind, authorRole],
  );
  const hasImageUrl = Boolean(imageUrl?.trim());
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showPhoto = hasImageUrl && showImage && !imageFailed;

  const [edgeColor, setEdgeColor] = useState<string | null>(
    showPhoto && imageUrl ? getCachedEdgeColor(imageUrl) : null,
  );
  const [photoBg, setPhotoBg] = useState<string | null>(
    showPhoto && imageUrl ? getCachedColor(imageUrl) : null,
  );

  useEffect(() => {
    if (!showPhoto || !imageUrl) {
      setEdgeColor(null);
      setPhotoBg(null);
      return;
    }
    const cachedEdge = getCachedEdgeColor(imageUrl);
    const cachedDom = getCachedColor(imageUrl);
    if (cachedEdge) setEdgeColor(cachedEdge);
    if (cachedDom) setPhotoBg(cachedDom);

    let cancelled = false;
    if (!cachedEdge) {
      extractEdgeColor(imageUrl).then((c) => {
        if (!cancelled) setEdgeColor(c);
      });
    }
    if (!cachedDom) {
      extractDominantColor(imageUrl).then((c) => {
        if (!cancelled) setPhotoBg(c);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [showPhoto, imageUrl]);

  const tintBackground = buildTintCardBackground(tint, mode);
  const matchedFill = backgroundOverride?.trim() || (showPhoto ? photoBg : null);
  const baseBackground = matchedFill || tintBackground;
  const edgeGradient = buildImageEdgeGradient(edgeColor || matchedFill || tint, mode);
  const scrim = resolveCardScrim(mode, variant, tint);
  const lightSurface = mode === "light" ? resolveLightSurface(tint) : null;
  const sportMeta = getSportColor(sport);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: aspectRatio === "auto" ? undefined : aspectRatio,
        background: baseBackground,
        ...style,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: baseBackground }} />

        {showPhoto && (
          <img
            src={imageUrl!}
            alt={imageAlt}
            className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onLoad={onImageLoad}
            onError={() => setImageFailed(true)}
          />
        )}

        {showPhoto && !clean && (
          <>
            {mode === "dark" ? (
              <>
                <div className="pointer-events-none absolute inset-0" style={{ background: edgeGradient }} />
                <div className="pointer-events-none absolute inset-0" style={{ background: scrim }} />
              </>
            ) : (
              <div className="pointer-events-none absolute inset-0" style={{ background: scrim }} />
            )}
          </>
        )}

        {!showPhoto && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: buildNoImageRadialGlow(tint, mode) }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: buildNoImageStripeTexture(tint, mode) }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10 select-none">
              <span
                aria-hidden
                style={{
                  fontSize: variant === "home" ? 44 : 38,
                  lineHeight: 1,
                  opacity: mode === "light" ? 0.2 : 0.26,
                }}
              >
                {sportMeta.emoji}
              </span>
              {sport?.trim() ? (
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    opacity: mode === "light" ? 0.38 : 0.5,
                    color: mode === "light" ? lightSurface?.text ?? "#242424" : "rgba(255,255,255,0.55)",
                  }}
                >
                  {sport}
                </span>
              ) : null}
            </div>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: noImageBottomFade(mode, tint) }}
            />
          </>
        )}

        {hasImageUrl && !showImage && mediaSlot}
      </div>

      {children ? <div className="absolute inset-0 z-[2]">{children}</div> : null}
    </div>
  );
}
