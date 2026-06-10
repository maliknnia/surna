import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  HOME_BELOW_CARD_MT,
  HOME_GRID_BG,
  HOME_IMAGE_SCRIM,
  HOME_TEXT_META,
  HOME_TEXT_SUBTITLE,
  type HomeCardKind,
  resolveHomeCardBackground,
  useHomeCardSurface,
} from "@/features/home/homeCardColors";
import { getEventCoverUrl } from "@/lib/eventCover";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import type { AttendeeEntityType } from "@/components/people/AttendeeCircles";
import { useHomeCardPillStyle } from "@/features/home/homeCardStyles";

const inter = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "Inter, sans-serif",
  ...extra,
});

function CardTextBelow({
  subtitle,
  meta,
  subtitleSize = 13,
  width,
}: {
  subtitle?: string;
  meta?: string;
  subtitleSize?: 12 | 13;
  width?: number | string;
}) {
  if (!subtitle && !meta) return null;
  return (
    <div style={{ marginTop: HOME_BELOW_CARD_MT, width: width ?? "100%" }}>
      {subtitle && (
        <p
          className="line-clamp-2 leading-snug"
          style={inter({ fontWeight: 400, fontSize: subtitleSize, color: HOME_TEXT_SUBTITLE })}
        >
          {subtitle}
        </p>
      )}
      {meta && (
        <p
          className="line-clamp-2 leading-snug"
          style={inter({
            fontWeight: 400,
            fontSize: 12,
            color: HOME_TEXT_META,
            marginTop: subtitle ? 2 : 0,
          })}
        >
          {meta}
        </p>
      )}
    </div>
  );
}

type ImageSurfaceProps = {
  imageUrl?: string | null;
  sport?: string | null;
  cardKind?: HomeCardKind;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  rounded?: string;
};

function HomeImageSurface({
  imageUrl,
  sport,
  cardKind,
  className = "",
  style,
  children,
  rounded = "rounded-lg",
}: ImageSurfaceProps) {
  const { hasImage, surfaceBackground, imageScrim, solidBackground } = useHomeCardSurface({
    imageUrl,
    sport,
    cardKind,
  });

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{ background: hasImage ? surfaceBackground : solidBackground, ...style }}
    >
      {hasImage && (
        <img src={imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
      {hasImage && imageScrim && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: imageScrim }} />
      )}
      {children}
    </div>
  );
}

/** Portrait scroll card — photo background, copy inside, caption below. */
export function HomePortraitCard({
  imageUrl,
  title,
  subtitle,
  meta,
  sport,
  cardKind,
  onClick,
  attendeeEntity,
  cta = "Join",
  showCaptionBelow = false,
}: {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  meta?: string;
  sport?: string | null;
  cardKind?: HomeCardKind;
  onClick: () => void;
  attendeeEntity?: { type: AttendeeEntityType; id: string; count?: number };
  cta?: string;
  /** Show location / time caption under the card (not on every tile). */
  showCaptionBelow?: boolean;
}) {
  const pillStyle = useHomeCardPillStyle();
  const cover =
    imageUrl?.trim() ||
    getEventCoverUrl({ sport: sport ?? undefined, title }) ||
    null;
  const { hasImage, cardBackground, imageScrim } = useHomeCardSurface({
    imageUrl: cover,
    sport,
    cardKind,
  });

  return (
    <div className="flex-shrink-0 w-[142px]">
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left active:scale-[0.98] transition-transform"
      >
        <div
          className="relative w-[142px] h-[190px] rounded-xl overflow-hidden"
          style={{ background: cardBackground }}
        >
          {hasImage && cover && (
            <>
              <img
                src={cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "rgba(0,0,0,0.35)",
                }}
              />
            </>
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: imageScrim || HOME_IMAGE_SCRIM }}
          />
          {attendeeEntity && (
            <div className="absolute top-2 left-2 z-[2]" onClick={(e) => e.stopPropagation()}>
              <CardAttendeeStrip
                entityType={attendeeEntity.type}
                entityId={attendeeEntity.id}
                fallbackCount={attendeeEntity.count}
                compact
                onPhoto
              />
            </div>
          )}
          <span
            className="absolute top-2 right-2 z-[2] px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={pillStyle}
          >
            {cta}
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
            <p
              className="text-[13px] font-bold text-white leading-snug line-clamp-2"
              style={{ ...inter(), textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
            >
              {title}
            </p>
            {meta && (
              <p className="text-[10px] text-white/75 mt-0.5 line-clamp-1" style={inter()}>
                {meta}
              </p>
            )}
          </div>
        </div>
      </button>
      {showCaptionBelow && (subtitle || meta) && (
        <CardTextBelow subtitle={subtitle} meta={meta} subtitleSize={12} width={142} />
      )}
    </div>
  );
}

/** Grid quick-access tile — 64px row, title inside, text below. */
export function HomeGridCard({
  title,
  subtitle,
  meta,
  imageUrl,
  sport,
  cardKind,
  label,
  onClick,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string | null;
  sport?: string | null;
  cardKind?: HomeCardKind;
  label: string;
  onClick: () => void;
}) {
  const { hasImage, surfaceBackground, imageScrim, solidBackground } = useHomeCardSurface({
    imageUrl,
    sport,
    cardKind,
  });

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center w-full h-16 rounded-md overflow-hidden text-left active:scale-[0.98] transition-transform"
        style={{ background: HOME_GRID_BG }}
        aria-label={label}
      >
        <div
          className="relative w-16 h-16 flex-shrink-0 overflow-hidden"
          style={{ background: hasImage ? surfaceBackground : solidBackground }}
        >
          {hasImage && (
            <img src={imageUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          )}
          {hasImage && imageScrim && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: imageScrim }} />
          )}
          {!hasImage && (
            <div
              className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white/45"
              style={inter()}
            >
              {label.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 px-3">
          <p className="text-[14px] font-bold text-white truncate" style={inter()}>
            {title}
          </p>
        </div>
      </button>
      <CardTextBelow subtitle={subtitle} meta={meta} />
    </div>
  );
}

/** Large featured card — full-width photo hero with copy on the image. */
export function HomeFeaturedCard({
  imageUrl,
  title,
  subtitle,
  meta,
  sport,
  cardKind,
  onClick,
  attendeeEntity,
  cta = "View",
  captionBelow,
}: {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  meta?: string;
  sport?: string | null;
  cardKind?: HomeCardKind;
  onClick: () => void;
  attendeeEntity?: { type: AttendeeEntityType; id: string; count?: number };
  cta?: string;
  captionBelow?: string;
}) {
  const pillStyle = useHomeCardPillStyle();
  const cover =
    imageUrl?.trim() ||
    getEventCoverUrl({ sport: sport ?? undefined, title }) ||
    null;
  const { hasImage, cardBackground, imageScrim } = useHomeCardSurface({
    imageUrl: cover,
    sport,
    cardKind,
  });

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-xl overflow-hidden text-left active:scale-[0.99] transition-transform"
        style={{ background: cardBackground }}
      >
        <div className="relative w-full aspect-[2/1] min-h-[130px]">
          {hasImage && cover && (
            <>
              <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "rgba(0,0,0,0.35)",
                }}
              />
            </>
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: imageScrim || HOME_IMAGE_SCRIM }}
          />
          {attendeeEntity && (
            <div className="absolute top-3 left-3 z-[2]" onClick={(e) => e.stopPropagation()}>
              <CardAttendeeStrip
                entityType={attendeeEntity.type}
                entityId={attendeeEntity.id}
                fallbackCount={attendeeEntity.count}
                onPhoto
              />
            </div>
          )}
          <div className="absolute inset-0 flex items-end p-4 gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[17px] font-bold text-white leading-snug line-clamp-2"
                style={{ ...inter(), textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
              >
                {title}
              </p>
              {subtitle && (
                <p className="text-[12px] text-white/80 mt-1 line-clamp-1" style={inter()}>
                  {subtitle}
                </p>
              )}
              {meta && (
                <p className="text-[11px] text-white/65 mt-0.5 line-clamp-1" style={inter()}>
                  {meta}
                </p>
              )}
            </div>
            <span className="shrink-0 px-4 py-2 rounded-full text-xs font-bold" style={pillStyle}>
              {cta}
            </span>
          </div>
        </div>
      </button>
      {captionBelow && (
        <CardTextBelow subtitle={captionBelow} subtitleSize={12} width="100%" />
      )}
    </div>
  );
}

function aimCoachGlow(el: HTMLDivElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  el.style.setProperty("--px", `${x.toFixed(1)}%`);
  el.style.setProperty("--py", `${y.toFixed(1)}%`);
}

/** Circle coach card — avatar + name/sport below. Optional pointer glow on avatar only. */
export function HomeCoachCircleCard({
  photo,
  initials,
  name,
  sport,
  onClick,
  glow = false,
}: {
  photo?: string | null;
  initials: string;
  name: string;
  sport: string;
  onClick: () => void;
  glow?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);
  const { hasImage, solidBackground, cardBackground } = useHomeCardSurface({
    imageUrl: photo,
    cardKind: "coach",
    sport,
  });

  const aimGlow = (clientX: number, clientY: number) => {
    if (frameRef.current) aimCoachGlow(frameRef.current, clientX, clientY);
  };

  const activate = (clientX: number, clientY: number) => {
    if (!glow) return;
    setLit(true);
    aimGlow(clientX, clientY);
  };

  useEffect(() => {
    if (!glow || !lit) return;
    const onMove = (e: PointerEvent) => aimGlow(e.clientX, e.clientY);
    const onEnd = () => setLit(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [glow, lit]);

  const frameHandlers = glow
    ? {
        onPointerEnter: (e: ReactPointerEvent) => activate(e.clientX, e.clientY),
        onPointerMove: (e: ReactPointerEvent) => {
          if (lit) aimGlow(e.clientX, e.clientY);
          else activate(e.clientX, e.clientY);
        },
        onPointerDown: (e: ReactPointerEvent) => activate(e.clientX, e.clientY),
        onPointerLeave: () => setLit(false),
        onPointerCancel: () => setLit(false),
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className="coach-circle-card flex-shrink-0 w-[120px] flex flex-col items-center active:scale-[0.98] transition-transform touch-manipulation"
    >
      <div
        ref={frameRef}
        {...frameHandlers}
        className={`coach-circle-card__frame${glow && lit ? " coach-circle-card__frame--lit" : ""}`}
      >
        <div
          className="coach-circle-card__avatar"
          style={{ background: hasImage ? cardBackground : solidBackground }}
        >
          {hasImage && (
            <img src={photo!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          )}
          {!hasImage && (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/80"
              style={inter()}
            >
              {initials || "C"}
            </div>
          )}
        </div>
      </div>
      <p
        className="text-[13px] text-center mt-2 line-clamp-2 w-full"
        style={{ ...inter({ fontWeight: 400, color: "var(--surna-text)" }), marginTop: HOME_BELOW_CARD_MT }}
      >
        {name}
      </p>
      <p
        className="text-[11px] text-center line-clamp-1 w-full"
        style={inter({ fontWeight: 400, color: HOME_TEXT_META })}
      >
        {sport}
      </p>
    </button>
  );
}

/** Full-width row with photo thumb — profile tint from logo/cover when available. */
export function HomeCompactRow({
  title,
  subtitle,
  captionBelow,
  cta,
  onClick,
  icon,
  imageUrl,
  sport,
  cardKind,
  attendeeEntity,
}: {
  title: string;
  subtitle?: string;
  captionBelow?: string;
  cta: string;
  onClick: () => void;
  icon: ReactNode;
  imageUrl?: string | null;
  sport?: string | null;
  cardKind?: HomeCardKind;
  attendeeEntity?: { type: AttendeeEntityType; id: string; count?: number };
}) {
  const pillStyle = useHomeCardPillStyle();
  const thumb =
    imageUrl?.trim() || getEventCoverUrl({ sport: sport ?? undefined, title }) || null;
  const { hasImage, cardBackground } = useHomeCardSurface({
    imageUrl: thumb,
    sport,
    cardKind,
  });
  const onProfileTint = hasImage || cardBackground !== HOME_GRID_BG;
  const textPrimary = onProfileTint ? "#ffffff" : "var(--surna-text)";
  const textMuted = onProfileTint ? "rgba(255,255,255,0.72)" : "var(--surna-text-muted)";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onClick}
        className="card-spotify relative w-full flex items-center gap-3 p-2.5 rounded-xl text-left active:scale-[0.98] transition-transform overflow-hidden"
        style={{ background: cardBackground }}
      >
        {hasImage && thumb && (
          <>
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ filter: "blur(2px) saturate(1.1)", transform: "scale(1.05)" }}
              loading="lazy"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.35)",
              }}
            />
          </>
        )}
        <div
          className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0"
          style={{
            background: onProfileTint ? "rgba(255,255,255,0.15)" : "var(--surna-surface)",
          }}
        >
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: onProfileTint ? "rgba(255,255,255,0.85)" : "var(--surna-text-secondary)" }}
            >
              {icon}
            </div>
          )}
        </div>
        <div className="relative flex-1 min-w-0 space-y-1">
          <p
            className="text-[13px] font-semibold leading-snug line-clamp-2"
            style={inter({ color: textPrimary })}
          >
            {title}
          </p>
          {attendeeEntity && (
            <CardAttendeeStrip
              entityType={attendeeEntity.type}
              entityId={attendeeEntity.id}
              fallbackCount={attendeeEntity.count}
              compact
            />
          )}
          {subtitle && (
            <p className="text-[11px] line-clamp-1" style={inter({ color: textMuted })}>
              {subtitle}
            </p>
          )}
        </div>
        <span className="relative text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={pillStyle}>
          {cta}
        </span>
      </button>
      {captionBelow && <CardTextBelow subtitle={captionBelow} subtitleSize={12} width="100%" />}
    </div>
  );
}

/** Marketplace square — title inside, description + price below. */
export function HomeMarketplaceCard({
  imageUrl,
  title,
  subtitle,
  meta,
  onClick,
}: {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-[140px]">
      <button type="button" onClick={onClick} className="w-full text-left active:scale-[0.98] transition-transform">
        <HomeImageSurface
          imageUrl={imageUrl}
          cardKind="marketplace"
          className="w-[140px] h-[140px]"
        >
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
            <p className="text-[14px] font-bold text-white leading-snug line-clamp-2" style={inter()}>
              {title}
            </p>
          </div>
        </HomeImageSurface>
      </button>
      <CardTextBelow subtitle={subtitle} meta={meta} width={140} />
    </div>
  );
}
