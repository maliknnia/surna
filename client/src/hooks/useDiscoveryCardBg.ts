import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { extractDominantColor, getCachedColor } from "@/lib/extractColor";
import { sportCardBg } from "@/lib/sportColors";

/** Card fill from the photo's dominant colour; sport tint when there is no image. */
export function useDiscoveryCardBg(
  imageUrl: string | null | undefined,
  sport: string | null | undefined,
) {
  const { theme } = useTheme();
  const mode = theme as "light" | "dark";
  const fallback = useMemo(() => sportCardBg(sport, mode), [sport, mode]);

  const [background, setBackground] = useState(() => {
    if (!imageUrl?.trim()) return fallback;
    return getCachedColor(imageUrl) ?? fallback;
  });

  useEffect(() => {
    if (!imageUrl?.trim()) {
      setBackground(fallback);
      return;
    }

    const cached = getCachedColor(imageUrl);
    if (cached) {
      setBackground(cached);
      return;
    }

    let cancelled = false;
    extractDominantColor(imageUrl).then((color) => {
      if (!cancelled) setBackground(color || fallback);
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, fallback]);

  return background;
}
