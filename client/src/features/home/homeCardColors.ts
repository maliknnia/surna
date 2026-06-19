import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildTintCardBackground,
  resolvePostCardTint,
  type PostCardContentKind,
} from "@/lib/postCardBackground";
import type { HomeCardKind } from "@/features/home/homeCardColors.types";
export type { HomeCardKind } from "@/features/home/homeCardColors.types";

export const HOME_TEXT_SUBTITLE = "var(--surna-text-secondary)";
export const HOME_TEXT_META = "var(--surna-text-muted)";
export const HOME_GRID_BG = "var(--surna-surface)";
export const HOME_BELOW_CARD_MT = "6px";

function mapCardKind(cardKind?: HomeCardKind): PostCardContentKind | undefined {
  if (!cardKind) return undefined;
  if (cardKind === "instantJoin") return "event";
  if (cardKind === "marketplace") return "regular";
  return cardKind;
}

export function homeCardTextColors(mode: "light" | "dark") {
  return mode === "light"
    ? { primary: "#121212", muted: "rgba(0,0,0,0.55)" }
    : { primary: "#ffffff", muted: "rgba(255,255,255,0.72)" };
}

export function useHomeCardTint(opts: {
  sport?: string | null;
  cardKind?: HomeCardKind;
}) {
  const { theme } = useTheme();
  const mode = theme === "light" ? "light" : "dark";
  const tint = useMemo(
    () =>
      resolvePostCardTint({
        sport: opts.sport,
        contentKind: mapCardKind(opts.cardKind),
      }),
    [opts.sport, opts.cardKind],
  );
  const gradientBackground = useMemo(
    () => buildTintCardBackground(tint, mode),
    [tint, mode],
  );
  const textColors = useMemo(() => homeCardTextColors(mode), [mode]);

  return { mode, tint, gradientBackground, textColors };
}
