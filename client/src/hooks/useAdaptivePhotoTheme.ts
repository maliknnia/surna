import { useEffect, useState } from "react";
import { extractDominantColor, getCachedColor, brightenHex } from "@/lib/extractColor";

/** Pulls dominant colour from a photo and exposes theme tokens for profile surfaces. */
export function useAdaptivePhotoTheme(imageUrl: string | null | undefined, isDark: boolean) {
  const fallback = isDark ? "#2a2a2a" : "#e8e8e8";
  const [accentColor, setAccentColor] = useState(() =>
    imageUrl ? getCachedColor(imageUrl) ?? fallback : fallback,
  );

  useEffect(() => {
    if (!imageUrl) {
      setAccentColor(fallback);
      return;
    }
    const cached = getCachedColor(imageUrl);
    if (cached) setAccentColor(cached);
    extractDominantColor(imageUrl).then(setAccentColor);
  }, [imageUrl, fallback]);

  const wash = brightenHex(accentColor, isDark ? 0.12 : 0.55);
  const pageBg = isDark
    ? `linear-gradient(180deg, ${accentColor}33 0%, ${accentColor}12 28%, #000000 58%)`
    : `linear-gradient(180deg, ${wash} 0%, ${accentColor}14 32%, #ffffff 58%)`;
  const bleedBg = isDark
    ? `radial-gradient(ellipse 120% 80% at 50% -10%, ${accentColor}55 0%, transparent 70%)`
    : `radial-gradient(ellipse 120% 80% at 50% -10%, ${accentColor}33 0%, transparent 70%)`;

  return { accentColor, pageBg, bleedBg, wash };
}
