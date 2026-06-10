/** SURNA camera UI tokens — minimal dark chrome */
export const CAMERA_TEXT = "#FFFFFF";
export const CAMERA_MUTED = "rgba(255, 255, 255, 0.55)";
export const CAMERA_BG = "#000000";
export const CAMERA_SURFACE = "#141414";
export const CAMERA_CARD = "#1a1a1a";
export const FONT_BARLOW = "'Barlow Condensed', Inter, sans-serif";

/** Shared palette for text + draw (same swatches, same selection ring). */
export const EDITOR_COLORS = [
  { value: "#FFFFFF", label: "White" },
  { value: "#000000", label: "Black" },
  { value: "#FF453A", label: "Red" },
  { value: "#FFD60A", label: "Gold" },
] as const;

export const EDITOR_UI = {
  swatchSize: 32,
  swatchRing: "2px solid #FFFFFF",
  swatchRingIdle: "2px solid rgba(255, 255, 255, 0.28)",
  toolbarBg: "rgba(0, 0, 0, 0.45)",
  chipBg: "rgba(255, 255, 255, 0.1)",
  chipBgActive: "rgba(255, 255, 255, 0.22)",
  chipBorder: "1px solid rgba(255, 255, 255, 0.2)",
  previewFrame: "1px solid rgba(255, 255, 255, 0.18)",
  sheetBg: "rgba(18, 18, 18, 0.98)",
  sheetBorder: "1px solid rgba(255, 255, 255, 0.1)",
} as const;

/** @deprecated use EDITOR_COLORS */
export const CAMERA_PURPLE = "#FFFFFF";
export const CAMERA_PURPLE_DIM = "rgba(255, 255, 255, 0.25)";
export const CAMERA_ACCENT = "#FFFFFF";
