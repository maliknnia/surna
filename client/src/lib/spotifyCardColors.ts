import { getSportColor } from "@/lib/sportColors";

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function mixHex(a: string, b: string, ratio: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar * (1 - ratio) + br * ratio);
  const g = Math.round(ag * (1 - ratio) + bg * ratio);
  const bl = Math.round(ab * (1 - ratio) + bb * ratio);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const DARK_NEUTRALS = ["#282828", "#303030", "#333333", "#2e2a2a", "#2a2e30", "#2e2828"];
const LIGHT_NEUTRALS = ["#f0f0f0", "#ebebeb", "#f2f2f2", "#ececec", "#e8e8e8", "#f5f3f3"];

/** Muted solid card background — Spotify playlist style, not full-bleed photo. */
export function spotifyMutedCardBg(
  seed: string,
  sport?: string | null,
  theme: "light" | "dark" = "dark",
): string {
  const base =
    theme === "light"
      ? LIGHT_NEUTRALS[hashSeed(seed) % LIGHT_NEUTRALS.length]
      : DARK_NEUTRALS[hashSeed(seed) % DARK_NEUTRALS.length];
  if (!sport) return base;
  const sportDark = getSportColor(sport).dark;
  return mixHex(base, sportDark, 0.22);
}
