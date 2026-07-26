import { type CSSProperties, type ReactNode } from "react";
import {
  HOME_BELOW_CARD_MT,
  HOME_GRID_BG,
  HOME_TEXT_META,
  HOME_TEXT_SUBTITLE,
  useHomeCardTint,
  type HomeCardKind,
} from "@/features/home/homeCardColors";
import { PostCardMediaBackdrop } from "@/components/feed/PostCardMediaBackdrop";
import { getEventCoverUrl } from "@/lib/eventCover";
import { buildNoImageRadialGlow, buildNoImageStripeTexture } from "@/lib/postCardBackground";
import type { PostCardContentKind } from "@/lib/postCardBackground";
import { CardAttendeeStrip } from "@/components/people/CardAttendeeStrip";
import type { AttendeeEntityType } from "@/components/people/AttendeeCircles";
import { useHomeCardPillStyle } from "@/features/home/homeCardStyles";
import { useDiscoveryCardBg } from "@/hooks/useDiscoveryCardBg";
import { isLightHex } from "@/lib/colorUtils";

const inter = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "Inter, sans-serif",
  ...extra,
});

function toContentKind(cardKind?: HomeCardKind): PostCardContentKind | undefined {
  if (!cardKind) return undefined;
  if (cardKind === "instantJoin") return "event";
  if (cardKind === "marketplace") return "regular";
  return cardKind;
}

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
  return (
    <PostCardMediaBackdrop
      imageUrl={imageUrl}
      sport={sport}
      contentKind={toContentKind(cardKind)}
      aspectRatio="auto"
      variant="home"
      className={`${rounded} ${className}`}
      style={style}
    >
      {children}
    </PostCardMediaBackdrop>
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
  const { textColors } = useHomeCardTint({ sport, cardKind });
  const cover =
    imageUrl?.trim() ||
    getEventCoverUrl({ sport: sport ?? undefined, title });

  return (
    <div className="flex-shrink-0 w-[142px]">
      <PostCardMediaBackdrop
        imageUrl={cover}
        sport={sport}
        contentKind={toContentKind(cardKind)}
        aspectRatio="142/190"
        variant="home"
        className="w-[142px] h-[190px] rounded-xl surna-air-photo active:scale-[0.98] transition-transform cursor-pointer"
        onClick={onClick}
      >
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
        {cta ? (
          <span
            className="absolute top-2 right-2 z-[2] px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={pillStyle}
          >
            {cta}
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
          <p
            className="text-[13px] font-bold leading-snug line-clamp-2"
            style={{
              ...inter(),
              color: textColors.primary,
              textShadow: "0 1px 6px rgba(0,0,0,0.55)",
            }}
          >
            {title}
          </p>
          {meta && (
            <p className="text-[10px] mt-0.5 line-clamp-1" style={inter({ color: textColors.muted })}>
              {meta}
            </p>
          )}
        </div>
      </PostCardMediaBackdrop>
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
  const { textColors } = useHomeCardTint({ sport, cardKind });
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center w-full h-16 rounded-md overflow-hidden text-left surna-air-photo active:scale-[0.98] transition-transform"
        style={{ background: HOME_GRID_BG }}
        aria-label={label}
      >
        <PostCardMediaBackdrop
          imageUrl={imageUrl}
          sport={sport}
          contentKind={toContentKind(cardKind)}
          aspectRatio="auto"
          variant="home"
          className="relative w-16 h-16 flex-shrink-0 overflow-hidden"
        >
          {!hasImage && (
            <div
              className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
              style={inter({ color: textColors.muted })}
            >
              {label.charAt(0)}
            </div>
          )}
        </PostCardMediaBackdrop>
        <div className="flex-1 min-w-0 px-3">
          <p className="text-[14px] font-bold truncate" style={inter({ color: "var(--surna-text)" })}>
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
  cta,
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
  const { textColors } = useHomeCardTint({ sport, cardKind });
  const cover =
    imageUrl?.trim() ||
    getEventCoverUrl({ sport: sport ?? undefined, title });

  return (
    <div className="w-full">
      <PostCardMediaBackdrop
        imageUrl={cover}
        sport={sport}
        contentKind={toContentKind(cardKind)}
        aspectRatio="2/1"
        variant="home"
        className="w-full rounded-xl min-h-[130px] surna-air-photo active:scale-[0.99] transition-transform cursor-pointer"
        onClick={onClick}
      >
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
              className="text-[17px] font-bold leading-snug line-clamp-2"
              style={{
                ...inter(),
                color: textColors.primary,
                textShadow: "0 1px 10px rgba(0,0,0,0.5)",
              }}
            >
              {title}
            </p>
            {subtitle && (
              <p className="text-[12px] mt-1 line-clamp-1" style={inter({ color: textColors.muted })}>
                {subtitle}
              </p>
            )}
            {meta && (
              <p className="text-[11px] mt-0.5 line-clamp-1" style={inter({ color: textColors.muted })}>
                {meta}
              </p>
            )}
          </div>
          {cta ? (
            <span className="shrink-0 px-4 py-2 rounded-full text-xs font-bold" style={pillStyle}>
              {cta}
            </span>
          ) : null}
        </div>
      </PostCardMediaBackdrop>
      {captionBelow && (
        <CardTextBelow subtitle={captionBelow} subtitleSize={12} width="100%" />
      )}
    </div>
  );
}

/** Circle coach card — clean portrait, plain elevated empty state. */
export function HomeCoachCircleCard({
  photo,
  initials,
  name,
  sport,
  onClick,
  sample = false,
}: {
  photo?: string | null;
  initials: string;
  name: string;
  sport: string;
  onClick: () => void;
  /** Showcase / demo coach — quieter label under sport. */
  sample?: boolean;
  /** @deprecated Glow removed — kept for call-site compat. */
  glow?: boolean;
}) {
  const hasPhoto = Boolean(photo?.trim());

  return (
    <button
      type="button"
      onClick={onClick}
      className={`coach-circle-card flex-shrink-0 w-[104px] flex flex-col items-center active:scale-[0.97] transition-transform touch-manipulation${
        sample ? " coach-circle-card--sample" : ""
      }`}
    >
      <div className="coach-circle-card__frame surna-air-photo" style={{ width: 96, height: 96 }}>
        <div
          className="coach-circle-card__avatar relative overflow-hidden"
          style={{ background: "var(--surna-elevated)" }}
        >
          {hasPhoto ? (
            <img src={photo!} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center text-xl font-bold"
              style={inter({ color: "var(--surna-text-secondary)" })}
            >
              {initials || "C"}
            </div>
          )}
        </div>
      </div>
      <p
        className="text-[12px] text-center mt-2.5 line-clamp-2 w-full font-semibold leading-snug"
        style={{ ...inter({ fontWeight: 600, color: "var(--surna-text)" }), marginTop: HOME_BELOW_CARD_MT }}
      >
        {name}
      </p>
      <p
        className="text-[11px] text-center line-clamp-1 w-full"
        style={inter({ fontWeight: 400, color: HOME_TEXT_META })}
      >
        {sport}
      </p>
      {sample ? (
        <p className="text-[10px] text-center w-full mt-0.5" style={inter({ color: HOME_TEXT_META, opacity: 0.75 })}>
          Sample
        </p>
      ) : null}
    </button>
  );
}

/**
 * Demo/sample event tile — solid photo-extracted colour + sharp cover thumb
 * (mirrors discovery EventCard, cleaner than full-bleed photo portraits).
 */
export function HomeSampleEventCard({
  imageUrl,
  title,
  meta,
  sport,
  onClick,
}: {
  imageUrl?: string | null;
  title: string;
  meta?: string;
  sport?: string | null;
  onClick: () => void;
}) {
  const cover =
    imageUrl?.trim() || getEventCoverUrl({ sport: sport ?? undefined, title });
  const background = useDiscoveryCardBg(cover, sport);
  const light = isLightHex(background);
  const primary = light ? "#121212" : "#ffffff";
  const muted = light ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.68)";

  return (
    <button
      type="button"
      onClick={onClick}
      className="home-sample-card home-sample-card--event flex-shrink-0 w-[142px] h-[190px] rounded-xl text-left active:scale-[0.98] transition-transform touch-manipulation surna-air-surface"
      style={{ background }}
    >
      <span className="home-sample-card__chip" style={{ color: muted, borderColor: muted }}>
        Sample
      </span>
      <div className="home-sample-card__thumb" style={{ background: light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.12)" }}>
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="home-sample-card__copy">
        <p className="text-[13px] font-bold leading-snug line-clamp-2" style={inter({ color: primary })}>
          {title}
        </p>
        {meta ? (
          <p className="text-[10px] mt-1 line-clamp-2" style={inter({ color: muted })}>
            {meta}
          </p>
        ) : null}
      </div>
    </button>
  );
}

/**
 * Demo/sample team tile — soft cover blur + crest logo
 * (mirrors discovery TeamCard / team page hero treatment).
 */
export function HomeSampleTeamCard({
  logoUrl,
  coverUrl,
  title,
  meta,
  sport,
  onClick,
}: {
  logoUrl?: string | null;
  coverUrl?: string | null;
  title: string;
  meta?: string;
  sport?: string | null;
  onClick: () => void;
}) {
  const crest = logoUrl?.trim() || coverUrl?.trim() || getEventCoverUrl({ sport: sport ?? undefined, title });
  const blur = coverUrl?.trim() || crest;

  return (
    <button
      type="button"
      onClick={onClick}
      className="home-sample-card home-sample-card--team flex-shrink-0 w-[142px] h-[190px] rounded-xl text-left active:scale-[0.98] transition-transform touch-manipulation overflow-hidden"
    >
      {blur ? (
        <div className="home-sample-card__blur" aria-hidden>
          <img src={blur} alt="" loading="lazy" />
          <div className="home-sample-card__blur-scrim" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: "var(--surna-elevated)" }} />
      )}
      <span className="home-sample-card__chip home-sample-card__chip--on-photo">Sample</span>
      <div className="home-sample-card__crest">
        {crest ? (
          <img src={crest} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <span className="text-lg font-bold text-white/80">{(title[0] || "T").toUpperCase()}</span>
        )}
      </div>
      <div className="home-sample-card__copy home-sample-card__copy--on-photo">
        <p className="text-[13px] font-bold leading-snug line-clamp-2 text-white" style={inter()}>
          {title}
        </p>
        {meta ? (
          <p className="text-[10px] mt-1 line-clamp-2 text-white/70" style={inter()}>
            {meta}
          </p>
        ) : null}
      </div>
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
  cta?: string;
  onClick: () => void;
  icon: ReactNode;
  imageUrl?: string | null;
  sport?: string | null;
  cardKind?: HomeCardKind;
  attendeeEntity?: { type: AttendeeEntityType; id: string; count?: number };
}) {
  const pillStyle = useHomeCardPillStyle();
  const { textColors } = useHomeCardTint({ sport, cardKind });
  const thumb =
    imageUrl?.trim() || getEventCoverUrl({ sport: sport ?? undefined, title });

  return (
    <div className="w-full">
      <PostCardMediaBackdrop
        imageUrl={thumb}
        sport={sport}
        contentKind={toContentKind(cardKind)}
        aspectRatio="auto"
        variant="home"
        className="w-full rounded-xl min-h-[72px] surna-air-photo active:scale-[0.98] transition-transform cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-3 p-2.5 h-full w-full">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/10">
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: textColors.muted }}
            >
              {icon}
            </div>
          )}
        </div>
        <div className="relative flex-1 min-w-0 space-y-1">
          <p
            className="text-[13px] font-semibold leading-snug line-clamp-2"
            style={inter({ color: textColors.primary })}
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
            <p className="text-[11px] line-clamp-1" style={inter({ color: textColors.muted })}>
              {subtitle}
            </p>
          )}
        </div>
        {cta ? (
          <span className="relative text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={pillStyle}>
            {cta}
          </span>
        ) : null}
        </div>
      </PostCardMediaBackdrop>
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
