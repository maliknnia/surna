import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { extractEdgeColor, getCachedEdgeColor } from "@/lib/extractColor";
import {
  POST_CARD_DARK_SCRIM,
  buildImageEdgeGradient,
  buildSportImageWash,
  buildTintCardBackground,
  resolvePostCardTint,
  type PostCardContentKind,
} from "@/lib/postCardBackground";
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
  /** Foreground UI (play button, tags) — rendered above scrim */
  children?: ReactNode;
  /**
   * When true, renders `imageUrl` as cover. When false, use `mediaSlot` for `<picture>` etc.
   * Edge colour is still sampled from `imageUrl` when set.
   */
  showImage?: boolean;
  mediaSlot?: ReactNode;
  imageAlt?: string;
  onImageLoad?: () => void;
  imageClassName?: string;
  /** Demo / custom gradient when there is no photo (e.g. home media highlights). */
  backgroundOverride?: string | null;
};

/**
 * Media area for home/feed cards: sport tint (no image) or photo + edge-colour gradient + dark scrim.
 * Text on top should use white / white/70 for contrast.
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
}: PostCardMediaBackdropProps) {
  const tint = useMemo(
    () => resolvePostCardTint({ sport, contentKind, authorRole }),
    [sport, contentKind, authorRole],
  );
  const hasImage = Boolean(imageUrl?.trim());

  const [edgeColor, setEdgeColor] = useState<string | null>(
    hasImage && imageUrl ? getCachedEdgeColor(imageUrl) : null,
  );

  useEffect(() => {
    if (!hasImage || !imageUrl) {
      setEdgeColor(null);
      return;
    }
    const cached = getCachedEdgeColor(imageUrl);
    if (cached) {
      setEdgeColor(cached);
      return;
    }
    let cancelled = false;
    extractEdgeColor(imageUrl).then((c) => {
      if (!cancelled) setEdgeColor(c);
    });
    return () => {
      cancelled = true;
    };
  }, [hasImage, imageUrl]);

  const edgeGradient = buildImageEdgeGradient(edgeColor || tint);
  const tintBackground = buildTintCardBackground(tint);
  const noImageBackground =
    backgroundOverride?.trim() || tintBackground;
  const sportWash = buildSportImageWash(tint);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: aspectRatio === "auto" ? undefined : aspectRatio,
        background: hasImage ? "#0a0a0a" : noImageBackground,
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
        {hasImage && showImage && (
          <img
            src={imageUrl!}
            alt={imageAlt}
            className={cn("h-full w-full object-cover", imageClassName)}
            loading="lazy"
            onLoad={onImageLoad}
          />
        )}
        {hasImage && !showImage && mediaSlot}
        {hasImage && (
          <>
            <div className="pointer-events-none absolute inset-0" style={{ background: sportWash }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: edgeGradient }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: POST_CARD_DARK_SCRIM }} />
          </>
        )}
        {!hasImage && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)",
            }}
          />
        )}
      </div>
      {children ? <div className="absolute inset-0 z-[2]">{children}</div> : null}
    </div>
  );
}
