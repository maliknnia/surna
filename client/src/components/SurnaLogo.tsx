import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  SURNA_LOGO_MARK_LIGHT_URL,
  SURNA_LOGO_MARK_URL,
  SURNA_LOGO_URL,
} from "@/lib/ownerAvatar";
import { cn } from "@/lib/utils";

interface SurnaLogoProps {
  className?: string;
  showText?: boolean;
  variant?: "default" | "mobile-hero";
  size?: "sm" | "md" | "lg";
}

function useLogoIsDark() {
  const { theme } = useTheme();
  return useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, [theme]);
}

export default function SurnaLogo({
  className = "h-5 w-auto",
  showText = true,
  variant = "default",
  size = "sm",
}: SurnaLogoProps) {
  const isDark = useLogoIsDark();
  const imgSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const logoSrc = isDark ? SURNA_LOGO_MARK_LIGHT_URL : SURNA_LOGO_MARK_URL;

  const logoImg = (
    <div
      className={cn(
        imgSizes[size],
        "relative shrink-0 rounded-full overflow-hidden flex items-center justify-center",
        isDark
          ? "bg-white/[0.08] ring-1 ring-white/15"
          : "bg-black/[0.04] ring-1 ring-black/10",
      )}
    >
      <img
        src={logoSrc}
        alt="SURNA"
        className="h-[88%] w-[88%] object-contain"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.dataset.fallback !== "1") {
            img.dataset.fallback = "1";
            img.src = SURNA_LOGO_URL;
          }
        }}
      />
    </div>
  );

  if (variant === "mobile-hero") {
    const textSizes = {
      sm: "text-2xl",
      md: "text-3xl",
      lg: "text-4xl",
    };

    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {logoImg}
        {showText && (
          <span
            className={`${textSizes[size]} font-black tracking-tight text-token-text`}
            style={{
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              letterSpacing: "-0.02em",
            }}
          >
            SURNA
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {logoImg}
      {showText && (
        <span
          className="text-xl font-black tracking-tight text-token-text"
          style={{
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: "-0.02em",
          }}
        >
          SURNA
        </span>
      )}
    </div>
  );
}
