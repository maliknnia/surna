import type { MapPin } from "./InteractiveMap";

const ISO: Record<
  Exclude<MapPin["type"], "place">,
  { top: string; left: string; right: string; glyph: string; accent: string }
> = {
  event: {
    top: "#FF8A65",
    left: "#E64A19",
    right: "#BF360C",
    accent: "#FFF3E0",
    glyph: `<rect x="19" y="14" width="10" height="8" rx="1" fill="#FFF3E0"/><path d="M21 12h6v2h-6z" fill="#FFF3E0"/>`,
  },
  team: {
    top: "#81C784",
    left: "#43A047",
    right: "#2E7D32",
    accent: "#E8F5E9",
    glyph: `<circle cx="24" cy="17" r="5" fill="#E8F5E9"/><path d="M17 24c0-3.5 3.1-6 7-6s7 2.5 7 6" fill="#E8F5E9"/>`,
  },
  coach: {
    top: "#FFD54F",
    left: "#FFB300",
    right: "#FF8F00",
    accent: "#FFF8E1",
    glyph: `<rect x="18" y="13" width="12" height="9" rx="1.5" fill="#FFF8E1"/><path d="M20 16h8M20 19h5" stroke="#FF8F00" stroke-width="1.2"/>`,
  },
  player: {
    top: "#64B5F6",
    left: "#1E88E5",
    right: "#1565C0",
    accent: "#E3F2FD",
    glyph: `<circle cx="24" cy="16" r="4.5" fill="#E3F2FD"/><path d="M16 25c1.2-4 4.8-6 8-6s6.8 2 8 6" fill="#E3F2FD"/>`,
  },
  person: {
    top: "#64B5F6",
    left: "#1E88E5",
    right: "#1565C0",
    accent: "#E3F2FD",
    glyph: `<circle cx="24" cy="16" r="4.5" fill="#E3F2FD"/><path d="M16 25c1.2-4 4.8-6 8-6s6.8 2 8 6" fill="#E3F2FD"/>`,
  },
  challenge: {
    top: "#CE93D8",
    left: "#AB47BC",
    right: "#7B1FA2",
    accent: "#F3E5F5",
    glyph: `<path d="M24 12l2 5h5l-4 3.5 1.5 5.5L24 23l-4.5 3 1.5-5.5-4-3.5h5z" fill="#F3E5F5"/>`,
  },
  instant: {
    top: "#4DD0E1",
    left: "#00ACC1",
    right: "#00838F",
    accent: "#E0F7FA",
    glyph: `<path d="M26 12l-8 10h6l-2 8 8-11h-6z" fill="#E0F7FA"/>`,
  },
  saved: {
    top: "#FFD54F",
    left: "#FFC107",
    right: "#FF8F00",
    accent: "#FFFDE7",
    glyph: `<path d="M24 13l2.2 4.5 5 .7-3.6 3.5.85 5L24 24.5l-4.45 2.2.85-5-3.6-3.5 5-.7z" fill="#FFFDE7"/>`,
  },
};

/** Isometric 2.5D pin — reads as 3D but stays lightweight 2D SVG. */
export function mapIsoPinSvg(
  type: MapPin["type"],
  size = 40,
  focused = false,
): string {
  if (type === "place") return "";

  const c = ISO[type] ?? ISO.event;
  const lift = focused ? 1 : 0;
  const shadow = focused ? 0.32 : 0.22;

  return [
    `<svg class="surna-spot-svg surna-map-pin-iso" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 52" width="${size}" height="${Math.round(size * 1.08)}" aria-hidden="true">`,
    `<ellipse cx="24" cy="48" rx="13" ry="3.5" fill="rgba(0,0,0,${shadow})"/>`,
    `<path d="M8 ${34 - lift} L24 ${26 - lift} L40 ${34 - lift} L24 ${42 - lift}Z" fill="${c.right}"/>`,
    `<path d="M24 ${26 - lift} L40 ${34 - lift} L40 ${40 - lift} L24 ${48 - lift} L24 ${26 - lift}Z" fill="${c.left}"/>`,
    `<path d="M8 ${34 - lift} L24 ${26 - lift} L24 ${48 - lift} L8 ${40 - lift}Z" fill="${c.right}" opacity="0.92"/>`,
    `<path d="M14 ${31 - lift} L24 ${26 - lift} L34 ${31 - lift} L24 ${36 - lift}Z" fill="${c.top}"/>`,
    `<g transform="translate(0 ${-lift})">${c.glyph}</g>`,
    `</svg>`,
  ].join("");
}

/** Small avatar tile for people — flat, no pin chrome. */
export function mapPersonAvatarSvg(src: string, size = 36, focused = false): string {
  const s = focused ? size + 4 : size;
  return [
    `<div class="surna-spot-avatar ${focused ? "surna-spot-avatar--focused" : ""}" style="width:${s}px;height:${s}px">`,
    `<img src="${src}" alt="" class="surna-spot-avatar-img" />`,
    `</div>`,
  ].join("");
}
