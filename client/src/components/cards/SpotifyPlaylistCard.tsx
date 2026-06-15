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
};

function cardTextColors(backgroundColor: string) {
  const lightBg = isLightHex(backgroundColor);
  return {
    primary: lightBg ? "#121212" : "#ffffff",
    muted: lightBg ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)",
    border: lightBg ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.28)",
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
}: SpotifyPlaylistCardProps) {
  const colors = cardTextColors(backgroundColor);

  const pillStyle: CSSProperties = {
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.primary,
  };

  const iconBtnStyle: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: `1px solid ${colors.border}`,
    background: "transparent",
    color: colors.primary,
  };

  return (
    <div
      className={`card-spotify playlist-card ${className}`.trim()}
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
      <div className="playlist-card__header">
        <div className="playlist-card__thumb" style={{ background: colors.thumbBg }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
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
                      background: isLightHex(backgroundColor)
                        ? "rgba(0,0,0,0.06)"
                        : "rgba(255,255,255,0.12)",
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
