/** Soft elevated surfaces for stat / activity cards — plain premium, no loud fills. */

export type StatCardTone = "neutral" | "win" | "loss" | "draw" | "gold" | "amber" | "accent";

export type StatCardSurface = {
  background: string;
  border: string;
  valueColor: string;
  labelColor: string;
  iconColor: string;
};

/** Shared plain elevated look — soft depth, no tint wash. */
const PLAIN: StatCardSurface = {
  background: "var(--surna-elevated)",
  border: "var(--surna-border)",
  valueColor: "var(--surna-text)",
  labelColor: "var(--surna-text-secondary)",
  iconColor: "var(--surna-text-secondary)",
};

const SURFACES: Record<StatCardTone, StatCardSurface> = {
  neutral: PLAIN,
  win: PLAIN,
  loss: PLAIN,
  draw: PLAIN,
  gold: PLAIN,
  amber: PLAIN,
  accent: PLAIN,
};

export function statCardSurface(tone: StatCardTone = "neutral"): StatCardSurface {
  return SURFACES[tone] ?? PLAIN;
}
