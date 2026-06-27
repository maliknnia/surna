import { MapPin, Star, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type EntityHeroProps = {
  coverUrl?: string | null;
  avatarUrl?: string | null;
  avatarFallback?: string;
  title: string;
  subtitle?: string;
  verified?: boolean;
  badge?: { label: string; tone?: "gold" | "muted" };
  rating?: number;
  onRatingClick?: () => void;
  bio?: string;
  location?: string;
  meta?: React.ReactNode;
  avatarSize?: "md" | "lg";
  className?: string;
};

function renderStars(rating: number) {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    const filled = rating >= i + 1;
    const half = !filled && rating >= i + 0.5;
    stars.push(
      <Star
        key={i}
        className="w-3.5 h-3.5"
        style={{ color: "var(--surna-gold, #f5c518)" }}
        fill={filled || half ? "currentColor" : "none"}
        strokeWidth={1.5}
      />,
    );
  }
  return stars;
}

export function EntityHero({
  coverUrl,
  avatarUrl,
  avatarFallback = "?",
  title,
  subtitle,
  verified,
  badge,
  rating,
  onRatingClick,
  bio,
  location,
  meta,
  avatarSize = "lg",
  className,
}: EntityHeroProps) {
  const avatarClass = avatarSize === "lg" ? "w-[96px] h-[96px]" : "w-[72px] h-[72px]";

  return (
    <div className={cn("pb-1", className)}>
      {coverUrl ? (
        <div
          className="-mx-4 mb-4 h-28 sm:h-32 overflow-hidden"
          style={{ borderBottom: "1px solid var(--surna-border)" }}
        >
          <img src={coverUrl} alt="" className="h-full w-full object-cover object-top" />
        </div>
      ) : null}

      <div className="flex flex-col items-center mb-3">
        <Avatar className={cn(avatarClass, "shrink-0 mb-3")}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} className="object-cover" /> : null}
          <AvatarFallback
            className="text-xl font-semibold"
            style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
          >
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center gap-2 mb-0.5 flex-wrap justify-center">
          <h2 className="text-[18px] font-bold leading-tight text-center" style={{ color: "var(--surna-text)" }}>
            {title}
          </h2>
          {verified ? (
            <CheckCircle2
              className="w-4 h-4 shrink-0"
              style={{ color: "var(--surna-gold, #f5c518)" }}
              fill="currentColor"
            />
          ) : null}
          {badge ? (
            <span
              className="px-2 py-0.5 rounded-full text-[12px] font-bold tabular-nums"
              style={
                badge.tone === "muted"
                  ? { background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }
                  : { background: "var(--surna-gold, #f5c518)", color: "#111" }
              }
            >
              {badge.label}
            </span>
          ) : null}
        </div>

        {subtitle ? (
          <p className="text-[14px] mb-1" style={{ color: "var(--surna-text-secondary)" }}>
            {subtitle}
          </p>
        ) : null}

        {rating != null && rating > 0 ? (
          <button
            type="button"
            onClick={onRatingClick}
            disabled={!onRatingClick}
            className="flex items-center gap-1.5 mb-2 active:opacity-70 disabled:cursor-default"
          >
            <span className="flex items-center gap-0.5">{renderStars(rating)}</span>
            <span className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--surna-gold, #f5c518)" }}>
              {rating.toFixed(1)}
            </span>
          </button>
        ) : null}

        {bio ? (
          <p
            className="text-[14px] text-center leading-snug whitespace-pre-wrap max-w-sm px-2"
            style={{ color: "var(--surna-text)" }}
          >
            {bio}
          </p>
        ) : null}

        {location ? (
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--surna-text-secondary)" }} />
            <span className="text-[13px]" style={{ color: "var(--surna-text-secondary)" }}>
              {location}
            </span>
          </div>
        ) : null}

        {meta}
      </div>
    </div>
  );
}
