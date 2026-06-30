import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { statCardSurface } from "@/lib/statCardStyle";
import { cn } from "@/lib/utils";

/** Subtle rating change chip — tinted pill instead of loud green/red text. */
export function RatingDeltaBadge({
  delta,
  suffix = "recent",
  className,
}: {
  delta: number;
  suffix?: string;
  className?: string;
}) {
  const tone = delta > 0 ? "win" : delta < 0 ? "loss" : "neutral";
  const surface = statCardSurface(tone);
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        className,
      )}
      style={{
        background: surface.background,
        border: `1px solid ${surface.border}`,
        color: surface.labelColor,
      }}
    >
      <Icon size={11} style={{ color: surface.iconColor }} aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
