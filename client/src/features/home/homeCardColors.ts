import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { sportCardBg } from "@/lib/sportColors";

export const HOME_TEXT_SUBTITLE = "var(--surna-text-secondary)";
export const HOME_TEXT_META = "var(--surna-text-muted)";
export const HOME_GRID_BG = "var(--surna-surface)";
export const HOME_BELOW_CARD_MT = "6px";

/** Bottom scrim on image cards — title stays readable on any photo. */
export const HOME_IMAGE_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.15) 100%)";

export type HomeCardKind = "event" | "team" | "challenge" | "instantJoin" | "marketplace" | "coach";

/** Solid sport-tinted background for cards without images. */
export function resolveHomeSportBackground(
  sport?: string | null,
  mode: "light" | "dark" = "dark",
): string {
  return sportCardBg(sport, mode);
}

export function resolveHomeCardBackground(
  opts: {
    sport?: string | null;
    cardKind?: HomeCardKind;
  },
  mode: "light" | "dark" = "dark",
): string {
  if (opts.cardKind === "marketplace") return sportCardBg("fitness", mode);
  if (opts.cardKind === "coach") return sportCardBg(opts.sport ?? "fitness", mode);
  return sportCardBg(opts.sport, mode);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return { r: 30, g: 30, b: 30 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Subtle tinted wrap behind photos. */
export function mutedImageContainerFromHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * 0.24)}, ${Math.round(g * 0.24)}, ${Math.round(b * 0.24)})`;
}

export function useHomeCardSurface(opts: {
  imageUrl?: string | null;
  sport?: string | null;
  cardKind?: HomeCardKind;
}) {
  const { imageUrl, sport, cardKind } = opts;
  const { theme } = useTheme();
  const mode = theme === "light" ? "light" : "dark";
  const fallbackBg = useMemo(
    () => resolveHomeCardBackground({ sport, cardKind }, mode),
    [sport, cardKind, mode],
  );
  const hasImage = Boolean(imageUrl?.trim());

  const [containerTint, setContainerTint] = useState<string>(() =>
    hasImage ? mutedImageContainerFromHex(fallbackBg) : fallbackBg,
  );

  const [dominantColor, setDominantColor] = useState<string | null>(() =>
    hasImage && imageUrl ? getCachedColor(imageUrl) : null,
  );

  useEffect(() => {
    if (!hasImage || !imageUrl) {
      setContainerTint(fallbackBg);
      setDominantColor(null);
      return;
    }

    const sportTint = mutedImageContainerFromHex(fallbackBg);
    setContainerTint(sportTint);

    const cached = getCachedColor(imageUrl);
    if (cached) {
      setDominantColor(cached);
      setContainerTint(mutedImageContainerFromHex(cached));
      return;
    }

    let cancelled = false;
    extractDominantColor(imageUrl)
      .then((hex) => {
        if (!cancelled) {
          setDominantColor(hex);
          setContainerTint(mutedImageContainerFromHex(hex));
        }
      })
      .catch(() => {
        if (!cancelled) setContainerTint(sportTint);
      });

    return () => {
      cancelled = true;
    };
  }, [hasImage, imageUrl, fallbackBg]);

  const cardBackground = fallbackBg;

  return {
    hasImage,
    solidBackground: fallbackBg,
    surfaceBackground: hasImage ? containerTint : fallbackBg,
    cardBackground,
    dominantColor,
    imageScrim: hasImage ? HOME_IMAGE_SCRIM : null,
  };
}
