import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { extractColors, type ExtractedColors } from "@/lib/colorExtractor";

interface ColorBleedProps {
  imageUrl?: string | null;
  className?: string;
  /** 0–1, default 0.3 */
  opacity?: number;
}

/**
 * Spotify-style ambient background from image dominant colors.
 */
export function ColorBleed({ imageUrl, className, opacity = 0.3 }: ColorBleedProps) {
  const [colors, setColors] = useState<ExtractedColors | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColors(null);
      return;
    }
    let cancelled = false;
    extractColors(imageUrl)
      .then((c) => {
        if (!cancelled) setColors(c);
      })
      .catch(() => {
        if (!cancelled) setColors(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  if (!colors) return null;

  return (
    <div
      className={cn("color-bleed transition-[background,opacity] duration-700 ease-out", className)}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 45%, ${colors.accent} 100%)`,
        opacity,
      }}
      aria-hidden
    />
  );
}
