/** Shared SURNA entity page tokens — matches ProfileInstagramView. */

export const entityBtnClass =
  "flex-1 h-[34px] rounded-lg text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 active:opacity-70 transition-opacity";

export const entityBtnSurface = {
  background: "var(--ig-profile-btn-bg)",
  color: "var(--surna-text)",
} as const;

export const entityCardStyle = {
  background: "var(--surna-elevated)",
  border: "none",
} as const;

export function formatEntityCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
