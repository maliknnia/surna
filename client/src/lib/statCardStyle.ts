/** Soft tinted surfaces for stat / activity cards — always filled, never bare grey. */

export type StatCardTone = "neutral" | "win" | "loss" | "draw" | "gold" | "amber" | "accent";

export type StatCardSurface = {
  background: string;
  border: string;
  valueColor: string;
  labelColor: string;
  iconColor: string;
};

const SURFACES: Record<StatCardTone, StatCardSurface> = {
  neutral: {
    background: "linear-gradient(145deg, color-mix(in srgb, var(--surna-text) 8%, var(--surna-elevated)) 0%, var(--surna-elevated) 100%)",
    border: "color-mix(in srgb, var(--surna-text) 10%, var(--surna-border))",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "var(--surna-text-secondary)",
  },
  win: {
    background: "linear-gradient(145deg, rgba(48, 209, 88, 0.18) 0%, rgba(48, 209, 88, 0.06) 100%)",
    border: "rgba(48, 209, 88, 0.22)",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "#30D158",
  },
  loss: {
    background: "linear-gradient(145deg, rgba(255, 69, 58, 0.16) 0%, rgba(255, 69, 58, 0.05) 100%)",
    border: "rgba(255, 69, 58, 0.2)",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "#FF453A",
  },
  draw: {
    background: "linear-gradient(145deg, rgba(142, 142, 147, 0.16) 0%, rgba(142, 142, 147, 0.05) 100%)",
    border: "rgba(142, 142, 147, 0.22)",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "var(--surna-text-secondary)",
  },
  gold: {
    background: "linear-gradient(145deg, color-mix(in srgb, var(--surna-gold, #f5c518) 22%, var(--surna-elevated)) 0%, var(--surna-elevated) 100%)",
    border: "color-mix(in srgb, var(--surna-gold, #f5c518) 28%, var(--surna-border))",
    valueColor: "var(--surna-gold, #f5c518)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "var(--surna-gold, #f5c518)",
  },
  amber: {
    background: "linear-gradient(145deg, rgba(255, 159, 10, 0.16) 0%, rgba(255, 159, 10, 0.05) 100%)",
    border: "rgba(255, 159, 10, 0.22)",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "#FF9F0A",
  },
  accent: {
    background: "linear-gradient(145deg, rgba(10, 132, 255, 0.14) 0%, rgba(10, 132, 255, 0.05) 100%)",
    border: "rgba(10, 132, 255, 0.2)",
    valueColor: "var(--surna-text)",
    labelColor: "var(--surna-text-secondary)",
    iconColor: "#0A84FF",
  },
};

export function statCardSurface(tone: StatCardTone = "neutral"): StatCardSurface {
  return SURFACES[tone];
}
