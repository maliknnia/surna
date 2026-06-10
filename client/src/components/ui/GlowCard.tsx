import React, { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  intensity?: "subtle" | "normal" | "harsh";
  /** Portrait card (default) or circular avatar ring */
  shape?: "card" | "circle";
  /** Wrap children with glow border only — no padding, fill, or heavy shadow */
  bare?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

const intensityMap = {
  subtle: { border: 2, size: 150, bgSpotOpacity: 0, borderBrightness: 1.65 },
  normal: { border: 3, size: 200, bgSpotOpacity: 0.1, borderBrightness: 2.1 },
  harsh: { border: 5, size: 360, bgSpotOpacity: 0.32, borderBrightness: 3.6 },
};

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

function syncGlowPointer(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  el.style.setProperty("--x", x.toFixed(2));
  el.style.setProperty("--xp", (x / Math.max(rect.width, 1)).toFixed(4));
  el.style.setProperty("--y", y.toFixed(2));
  el.style.setProperty("--yp", (y / Math.max(rect.height, 1)).toFixed(4));
}

function centerGlowPointer(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--x", (rect.width / 2).toFixed(2));
  el.style.setProperty("--xp", "0.5");
  el.style.setProperty("--y", (rect.height / 2).toFixed(2));
  el.style.setProperty("--yp", "0.5");
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = "",
  glowColor = "blue",
  size = "md",
  width,
  height,
  customSize = false,
  intensity = "normal",
  shape = "card",
  bare = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const tone = intensityMap[intensity];
  const isCircle = shape === "circle";

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    centerGlowPointer(el);

    const onPointer = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (inside) syncGlowPointer(el, e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const rect = el.getBoundingClientRect();
      const inside =
        t.clientX >= rect.left &&
        t.clientX <= rect.right &&
        t.clientY >= rect.top &&
        t.clientY <= rect.bottom;
      if (inside) syncGlowPointer(el, t.clientX, t.clientY);
    };

    el.addEventListener("pointermove", onPointer, { passive: true });
    el.addEventListener("pointerenter", onPointer, { passive: true });
    el.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      el.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerenter", onPointer);
      el.removeEventListener("touchmove", onTouch);
    };
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const getInlineStyles = (): CSSProperties & Record<string, string | number> => {
    const baseStyles: CSSProperties & Record<string, string | number> = {
      "--base": base,
      "--spread": spread,
      "--radius": isCircle ? 9999 : 14,
      "--border": tone.border,
      "--backdrop": bare
        ? "transparent"
        : intensity === "harsh"
          ? "hsla(0, 0%, 100%, 0.06)"
          : "hsla(0, 0%, 100%, 0.04)",
      "--backup-border": bare
        ? "transparent"
        : intensity === "harsh"
          ? "hsla(0, 0%, 100%, 0.18)"
          : intensity === "subtle"
            ? "hsla(0, 0%, 100%, 0.06)"
            : "hsla(0, 0%, 100%, 0.1)",
      "--size": tone.size,
      "--outer": 1,
      "--saturation": 100,
      "--lightness": 62,
      "--bg-spot-opacity": tone.bgSpotOpacity,
      "--border-spot-opacity": 1,
      "--border-light-opacity": intensity === "harsh" ? 0.9 : 0.75,
      "--glow-border-brightness": tone.borderBrightness,
    };

    if (width !== undefined) {
      baseStyles.width = typeof width === "number" ? `${width}px` : width;
    }
    if (height !== undefined) {
      baseStyles.height = typeof height === "number" ? `${height}px` : height;
    }

    return baseStyles;
  };

  return (
    <div
      ref={cardRef}
      data-glow
      data-glow-intensity={intensity}
      data-glow-shape={shape}
      style={getInlineStyles()}
      className={[
        "surna-glow",
        isCircle ? "surna-glow--circle" : "surna-glow--card",
        bare ? "surna-glow--bare" : "",
        customSize ? "" : sizeMap[size],
        !customSize && !isCircle && !bare ? "aspect-[3/4]" : "",
        isCircle ? "rounded-full" : bare ? "rounded-[18px]" : "rounded-2xl",
        "relative",
        bare
          ? "inline-flex shrink-0"
          : isCircle
            ? "inline-flex shrink-0"
            : "grid grid-rows-[1fr_auto] gap-4 p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div data-glow aria-hidden className="surna-glow-blur" />
      {children}
    </div>
  );
};

export { GlowCard };
