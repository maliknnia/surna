import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { isLightHex } from "@/lib/colorUtils";

export type SpotifyCardAction = {
  label?: string;
  icon?: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "icon";
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
};

/** How the card body is painted behind content. */
export type DiscoveryCardBackdrop =
  /** Solid fill from photo colour / sport (events, coaches). */
  | "solid"
  /** Full atmosphere blur of the photo (venues). */
  | "blur"
  /** Soft hint of blur behind a logo thumb (teams). */
  | "soft-blur";

export type SpotifyPlaylistCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Sharp thumbnail (logo / cover / portrait). */
  imageUrl?: string | null;
  /**
   * Optional separate image for blur layer (e.g. team cover while thumb is logo).
   * Defaults to imageUrl.
   */
  blurImageUrl?: string | null;
  fallbackIcon?: ReactNode;
  backgroundColor: string;
  onCardClick?: () => void;
  primaryAction?: SpotifyCardAction;
  secondaryActions?: SpotifyCardAction[];
  menu?: ReactNode;
  extraContent?: ReactNode;
  className?: string;
  thumbSize?: "default" | "large";
  /** Card surface treatment — see DiscoveryCardBackdrop. */
  backdrop?: DiscoveryCardBackdrop;
  /** @deprecated Use backdrop="blur" | "solid" instead. */
  blurPhotoBackground?: boolean;
};

function cardTextColors(backgroundColor: string, photoBackdrop: boolean) {
  if (photoBackdrop) {
    return {
      primary: "#ffffff",
      muted: "rgba(255,255,255,0.72)",
      fill: "rgba(255,255,255,0.16)",
      thumbBg: "rgba(255,255,255,0.12)",
    };
  }
  const lightBg = isLightHex(backgroundColor);
  return {
    primary: lightBg ? "#121212" : "#ffffff",
    muted: lightBg ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)",
    fill: lightBg ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.14)",
    thumbBg: lightBg ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)",
  };
}

function resolveBackdrop(
  backdrop: DiscoveryCardBackdrop | undefined,
  blurPhotoBackground: boolean | undefined,
): DiscoveryCardBackdrop {
  if (backdrop) return backdrop;
  if (blurPhotoBackground === false) return "solid";
  if (blurPhotoBackground === true) return "blur";
  return "solid";
}

export default function SpotifyPlaylistCard({
  title,
  subtitle,
  meta,
  imageUrl,
  blurImageUrl,
  fallbackIcon,
  backgroundColor,
  onCardClick,
  primaryAction,
  secondaryActions = [],
  menu,
  extraContent,
  className = "",
  thumbSize = "default",
  backdrop,
  blurPhotoBackground,
}: SpotifyPlaylistCardProps) {
  const mode = resolveBackdrop(backdrop, blurPhotoBackground);
  const hasThumb = Boolean(imageUrl?.trim());
  const blurSrc = (blurImageUrl || imageUrl || "").trim();
  const useBlurBg = (mode === "blur" || mode === "soft-blur") && Boolean(blurSrc);
  const colors = cardTextColors(backgroundColor, useBlurBg);
  const thumbClass =
    thumbSize === "large"
      ? "playlist-card__thumb playlist-card__thumb--lg"
      : "playlist-card__thumb";

  const pillStyle: CSSProperties = {
    border: "none",
    background: colors.fill,
    color: colors.primary,
  };

  const iconBtnStyle: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "none",
    background: colors.fill,
    color: colors.primary,
  };

  return (
    <div
      className={`card-spotify playlist-card ${
        useBlurBg
          ? mode === "soft-blur"
            ? "playlist-card--photo-blur playlist-card--soft-blur"
            : "playlist-card--photo-blur"
          : ""
      } ${className}`.trim()}
      style={{ background: backgroundColor }}
      onClick={onCardClick}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
    >
      {useBlurBg ? (
        <div className="playlist-card__blur-layer" aria-hidden>
          <img
            src={blurSrc}
            alt=""
            className="playlist-card__blur-img"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="playlist-card__blur-scrim" />
        </div>
      ) : null}

      <div className="playlist-card__header">
        <div className={thumbClass} style={{ background: colors.thumbBg }}>
          {hasThumb ? (
            <img
              src={imageUrl!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="playlist-card__thumb-fallback">{fallbackIcon}</span>
          )}
        </div>

        <div className="playlist-card__titles">
          <p className="playlist-card__title" style={{ color: colors.primary }}>
            {title}
          </p>
          {subtitle ? (
            <p className="playlist-card__subtitle" style={{ color: colors.muted }}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {menu ? <div className="playlist-card__menu">{menu}</div> : null}
      </div>

      {meta ? (
        <p className="playlist-card__meta" style={{ color: colors.muted }}>
          {meta}
        </p>
      ) : null}

      {extraContent ? <div className="playlist-card__extra">{extraContent}</div> : null}

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="playlist-card__actions">
          {primaryAction ? (
            <button
              type="button"
              className="playlist-card__pill"
              style={{
                ...pillStyle,
                opacity: primaryAction.disabled ? 0.5 : 1,
              }}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              aria-label={primaryAction.ariaLabel || primaryAction.label}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          ) : null}

          <div className="flex-1" />

          {secondaryActions.map((action, i) => (
            <button
              key={i}
              type="button"
              className="playlist-card__icon-btn"
              style={{
                ...iconBtnStyle,
                opacity: action.disabled ? 0.45 : 1,
                ...(action.active
                  ? {
                      background: colors.fill,
                      opacity: 1,
                    }
                  : {}),
              }}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel || action.label}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
