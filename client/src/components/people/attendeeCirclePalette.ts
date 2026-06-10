import type { CSSProperties } from "react";

/** Solid swatches — dark brown, blood red, black, and light tones. No borders. */
const ATTENDEE_COLORS: Array<{ bg: string; text: string }> = [
  { bg: "#2C1810", text: "#F5EDE4" },
  { bg: "#4A3728", text: "#FFF8F0" },
  { bg: "#5C4033", text: "#FFF5EB" },
  { bg: "#8B1A1A", text: "#FFF0F0" },
  { bg: "#6B0F0F", text: "#FFEBEB" },
  { bg: "#0A0A0A", text: "#FFFFFF" },
  { bg: "#141414", text: "#F0F0F0" },
  { bg: "#722F37", text: "#FFF5F6" },
  { bg: "#3D1F1F", text: "#FFE8E8" },
  { bg: "#E8D5C4", text: "#2C1810" },
  { bg: "#D4A574", text: "#1A1008" },
  { bg: "#C9B8A8", text: "#2C1810" },
  { bg: "#F0E6DC", text: "#3D2914" },
  { bg: "#7D5A3C", text: "#FFF8F0" },
];

function hashId(id: string, index: number): number {
  let h = index;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function pickAttendeeFill(id: string, index = 0): { bg: string; text: string } {
  return ATTENDEE_COLORS[hashId(id, index) % ATTENDEE_COLORS.length];
}

export function attendeeCircleShell(id: string, index: number): CSSProperties {
  const fill = pickAttendeeFill(id, index);
  return {
    background: fill.bg,
    border: "none",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.22)",
  };
}

export function attendeeInitialsStyle(id: string, index: number): CSSProperties {
  const fill = pickAttendeeFill(id, index);
  return {
    background: fill.bg,
    color: fill.text,
  };
}

export function attendeeOverflowStyle(id: string, visibleCount: number): CSSProperties {
  const fill = pickAttendeeFill(`${id}-overflow`, visibleCount);
  return {
    background: fill.bg,
    color: fill.text,
    border: "none",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.22)",
  };
}

export const ATTENDEE_CAPTION_ON_PHOTO = "rgba(255, 255, 255, 0.88)";
export const ATTENDEE_EMPTY_ON_PHOTO = "rgba(255, 255, 255, 0.62)";
