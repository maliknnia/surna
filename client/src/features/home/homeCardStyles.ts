import type { CSSProperties } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/** Join / Go pill — light: white bg + black text; dark: black bg + white text. */
export function useHomeCardPillStyle(): CSSProperties {
  const { isDark, theme } = useTheme();
  const dark = isDark ?? theme === "dark";
  return dark
    ? { background: "#0a0a0a", color: "#ffffff", border: "1px solid rgba(255,255,255,0.12)" }
    : { background: "#ffffff", color: "#0a0a0a", border: "1px solid rgba(0,0,0,0.08)" };
}

