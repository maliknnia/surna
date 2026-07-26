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

export type SpotifyPlaylistCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string | null;
  fallbackIcon?: ReactNode;
  backgroundColor: string;
  onCardClick?: () => void;
  primaryAction?: SpotifyCardAction;
  secondaryActions?: SpotifyCardAction[];
  menu?: ReactNode;
  extraContent?: ReactNode;
  className?: string;
  /** Larger artwork for team discovery cards */
  thumbSize?: "default" | "large";
  /**
   * When true (default) and imageUrl is set, fill the card with a blurred
   * version of that photo (events / teams / venues discovery look).
   */
  blurPhotoBackground?: boolean;
};

function cardTextColors(backgroundColor: string, photoBackdrop: boolean) {
  // Blurred photo + scrim always reads as a dark surface for type
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

export default function SpotifyPlaylistCard({
  title,
  subtitle,
  meta,
  imageUrl,
  fallbackIcon,
  backgroundColor,
  onCardClick,
  primaryAction,
  secondaryActions = [],
  menu,
  extraContent,
  className = "",
  thumbSize = "default",
  blurPhotoBackground = true,
}: SpotifyPlaylistCardProps) {
  const hasPhoto = Boolean(imageUrl?.trim());
  const useBlurBg = blurPhotoBackground && hasPhoto;
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
      className={`card-spotify playlist-card ${useBlurBg ? "playlist-card--photo-blur" : ""} ${className}`.trim()}
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
            src={imageUrl!}
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
          {hasPhoto ? (
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
