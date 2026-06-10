/** Subtle dark tints for text/image post cards (home + feed). */

/** Dark but visibly sport-tinted (readable with white text). */
export const POST_CARD_TINTS = {
  football: "#1a3d28",
  basketball: "#4a2a10",
  gaa: "#1a3528",
  rugby: "#1e2848",
  challenge: "#3d1a28",
  coach: "#3d3810",
  default: "#242424",
} as const;

export type PostCardContentKind =
  | "challenge"
  | "coach"
  | "event"
  | "team"
  | "regular"
  | "video"
  | "sponsored"
  | "place";

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(26, 26, 26, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeKey(value?: string | null): string {
  return (value || "").toLowerCase().replace(/[\s\-\.]/g, "_");
}

/** Sport / role / card-type → dark tint hex. */
export function resolvePostCardTint(opts: {
  sport?: string | null;
  contentKind?: PostCardContentKind | string | null;
  authorRole?: string | null;
}): string {
  const kind = normalizeKey(opts.contentKind ?? undefined);
  if (kind === "challenge") return POST_CARD_TINTS.challenge;
  if (kind === "coach" || normalizeKey(opts.authorRole) === "coach") {
    return POST_CARD_TINTS.coach;
  }

  const sport = normalizeKey(opts.sport);
  if (sport.includes("gaa") || sport.includes("hurling")) return POST_CARD_TINTS.gaa;
  if (sport.includes("rugby")) return POST_CARD_TINTS.rugby;
  if (sport.includes("basketball")) return POST_CARD_TINTS.basketball;
  if (
    sport.includes("football") ||
    sport.includes("soccer") ||
    sport.includes("futsal") ||
    sport === "football"
  ) {
    return POST_CARD_TINTS.football;
  }
  if (sport.includes("volleyball") || sport.includes("padel") || sport.includes("tennis")) {
    return POST_CARD_TINTS.rugby;
  }
  if (
    sport.includes("run") ||
    sport.includes("hik") ||
    sport.includes("cycl") ||
    sport.includes("swim")
  ) {
    return POST_CARD_TINTS.gaa;
  }

  return POST_CARD_TINTS.default;
}

/** Full-bleed background when there is no photo. */
export function buildTintCardBackground(tint: string): string {
  return `linear-gradient(165deg, ${hexToRgba(tint, 1)} 0%, ${hexToRgba(tint, 0.88)} 42%, ${hexToRgba(tint, 0.55)} 72%, #0a0a0a 100%)`;
}

/** Full-bleed wash so sport colour shows through photos. */
export function buildSportImageWash(tint: string, opacity = 0.34): string {
  return hexToRgba(tint, opacity);
}

/** Edge colour wash over a photo (stronger at bottom for text). */
export function buildImageEdgeGradient(edgeColor: string): string {
  return `linear-gradient(to top, ${hexToRgba(edgeColor, 0.58)} 0%, ${hexToRgba(edgeColor, 0.22)} 45%, transparent 72%)`;
}

export const POST_CARD_DARK_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.48) 42%, rgba(0,0,0,0.15) 100%)";

export function postCardTintGradient(opts: Parameters<typeof resolvePostCardTint>[0]): string {
  return buildTintCardBackground(resolvePostCardTint(opts));
}
