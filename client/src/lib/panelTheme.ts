/** Discovery panels (Teams, Venues, Events, Map) — SURNA tokens, no harsh #000/#fff chips */

export type PanelTheme = {
  pageBg: string;
  headerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  chipBg: string;
  chipText: string;
  chipActiveBg: string;
  chipActiveText: string;
  ctaBg: string;
  ctaText: string;
  sheetBg: string;
};

const PANEL_THEME_LIGHT: PanelTheme = {
  pageBg: "#F2F2F7",
  headerBg: "rgba(255, 255, 255, 0.88)",
  textPrimary: "#000000",
  textSecondary: "rgba(60, 60, 67, 0.6)",
  textMuted: "rgba(60, 60, 67, 0.3)",
  border: "rgba(0, 0, 0, 0.08)",
  inputBg: "#FFFFFF",
  chipBg: "#FFFFFF",
  chipText: "rgba(60, 60, 67, 0.6)",
  chipActiveBg: "#E5E5EA",
  chipActiveText: "#000000",
  ctaBg: "#000000",
  ctaText: "#FFFFFF",
  sheetBg: "#FFFFFF",
};

const PANEL_THEME_DARK: PanelTheme = {
  pageBg: "#000000",
  headerBg: "#000000",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(235, 235, 245, 0.6)",
  textMuted: "rgba(235, 235, 245, 0.3)",
  border: "rgba(255, 255, 255, 0.08)",
  inputBg: "#121212",
  chipBg: "#121212",
  chipText: "rgba(235, 235, 245, 0.6)",
  chipActiveBg: "#1E1E1E",
  chipActiveText: "#FFFFFF",
  ctaBg: "#FFFFFF",
  ctaText: "#000000",
  sheetBg: "#121212",
};

export function getPanelTheme(isDark?: boolean): PanelTheme {
  if (isDark === true) return PANEL_THEME_DARK;
  if (isDark === false) return PANEL_THEME_LIGHT;
  return {
    pageBg: "var(--surna-base)",
    headerBg: "var(--surna-base)",
    textPrimary: "var(--surna-text)",
    textSecondary: "var(--surna-text-secondary)",
    textMuted: "var(--surna-text-muted)",
    border: "var(--surna-border)",
    inputBg: "var(--surna-elevated)",
    chipBg: "var(--surna-elevated)",
    chipText: "var(--surna-text-secondary)",
    chipActiveBg: "var(--surna-surface)",
    chipActiveText: "var(--surna-text)",
    ctaBg: "var(--surna-text)",
    ctaText: "var(--surna-base)",
    sheetBg: "var(--surna-elevated)",
  };
}

export type MapOverlayTheme = PanelTheme & {
  surfaceBg: string;
  surfaceBgStrong: string;
  surfaceBorder: string;
  surfaceShadow: string;
  iconColor: string;
  iconMuted: string;
  iconFaint: string;
  overlayChipBg: string;
  sheetHandle: string;
  sheetBackdrop: string;
  sheetLabel: string;
  sheetReset: string;
  tileActiveBg: string;
  tileBg: string;
  tileActiveBorder: string;
  tileBorder: string;
  tileActiveText: string;
  tileText: string;
  tileTextFaint: string;
  mapOverlayGradient: string;
};

export function getMapOverlayTheme(isDark: boolean): MapOverlayTheme {
  const p = getPanelTheme();
  return {
    ...p,
    surfaceBg: isDark ? "rgba(18, 18, 18, 0.92)" : "rgba(255, 255, 255, 0.92)",
    surfaceBgStrong: isDark ? "rgba(18, 18, 18, 0.96)" : "rgba(255, 255, 255, 0.96)",
    surfaceBorder: `1px solid var(--surna-border)`,
    surfaceShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.45)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
    iconColor: p.textPrimary,
    iconMuted: p.textSecondary,
    iconFaint: p.textMuted,
    overlayChipBg: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)",
    sheetHandle: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
    sheetBackdrop: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.35)",
    sheetLabel: p.textMuted,
    sheetReset: p.textSecondary,
    tileActiveBg: "var(--surna-surface)",
    tileBg: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
    tileActiveBorder: `1.5px solid ${isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.14)"}`,
    tileBorder: `1.5px solid var(--surna-border)`,
    tileActiveText: p.textPrimary,
    tileText: p.textSecondary,
    tileTextFaint: p.textMuted,
    mapOverlayGradient: isDark
      ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 100%)"
      : "linear-gradient(to bottom, rgba(255, 255, 255, 0.55) 0%, transparent 100%)",
  };
}

export type PinSheetTheme = {
  surface: string;
  backdrop: string;
  inset: string;
  heroScrim: string;
  heroFade: string;
  heroControlBorder: string;
  heroControlIcon: string;
  heroBadgeColor: string;
  presenceRing: string;
  handle: string;
  shadow: string;
  textOnAccent: string;
};

/** Map pin bottom sheet — aligned with getMapOverlayTheme frosted surfaces. */
export function getPinSheetTheme(isDark: boolean): PinSheetTheme {
  const m = getMapOverlayTheme(isDark);
  return {
    surface: m.surfaceBgStrong,
    backdrop: m.sheetBackdrop,
    inset: m.overlayChipBg,
    heroScrim: isDark ? "rgba(18, 18, 18, 0.55)" : "rgba(255, 255, 255, 0.72)",
    heroFade: isDark
      ? "linear-gradient(to top, rgba(18, 18, 18, 0.98) 0%, rgba(18, 18, 18, 0.4) 50%, transparent 100%)"
      : "linear-gradient(to top, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.55) 50%, transparent 100%)",
    heroControlBorder: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
    heroControlIcon: isDark ? "#FFFFFF" : "#000000",
    heroBadgeColor: isDark ? "#FFFFFF" : "#000000",
    presenceRing: m.surfaceBgStrong,
    handle: m.sheetHandle,
    shadow: isDark ? "0 -16px 48px rgba(0, 0, 0, 0.4)" : "0 -12px 40px rgba(0, 0, 0, 0.12)",
    textOnAccent: m.ctaText,
  };
}
