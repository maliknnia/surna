/** Subtle dark tints for text/image post cards (home + feed). */

/** Dark but visibly sport-tinted (readable with white text). */
export const POST_CARD_TINTS = {
  football: "#1a3d28",
  basketball: "#4a2a10",
  gaa: "#1a3528",
  rugby: "#1e2848",
  running: "#1a3328",
  crossfit: "#3d2018",
  tennis: "#1a3020",
  swimming: "#1a2838",
  mma: "#3d1818",
  challenge: "#3d1a28",
  coach: "#3d3810",
  default: "#242424",
} as const;

/** Pastel bases for light mode — stay visible without washing out to white. */
export const POST_CARD_LIGHT_TINTS: Record<keyof typeof POST_CARD_TINTS, string> = {
  football: "#cfe8d6",
  basketball: "#f5dcc4",
  gaa: "#cce8d8",
  rugby: "#ccd4ec",
  running: "#cce8d4",
  crossfit: "#f0ccc0",
  tennis: "#cce8cc",
  swimming: "#c8d8ec",
  mma: "#ecc8c8",
  challenge: "#ecc0d0",
  coach: "#ece4c0",
  default: "#e2e2e2",
};

export function resolveLightTint(darkTint: string): string {
  for (const key of Object.keys(POST_CARD_TINTS) as Array<keyof typeof POST_CARD_TINTS>) {
    if (POST_CARD_TINTS[key] === darkTint) return POST_CARD_LIGHT_TINTS[key];
  }
  return POST_CARD_LIGHT_TINTS.default;
}

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
  if (sport.includes("crossfit")) return POST_CARD_TINTS.crossfit;
  if (sport.includes("tennis") || sport.includes("padel")) return POST_CARD_TINTS.tennis;
  if (sport.includes("swim")) return POST_CARD_TINTS.swimming;
  if (sport.includes("mma") || sport.includes("box")) return POST_CARD_TINTS.mma;
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
    sport.includes("cycl")
  ) {
    return POST_CARD_TINTS.running;
  }

  return POST_CARD_TINTS.default;
}

/** Full-bleed background when there is no photo. */
export function buildTintCardBackground(
  tint: string,
  mode: "light" | "dark" = "dark",
): string {
  if (mode === "light") {
    const light = resolveLightTint(tint);
    return `linear-gradient(180deg, ${light} 0%, ${hexToRgba(tint, 0.32)} 52%, ${hexToRgba(tint, 0.2)} 100%)`;
  }
  return `linear-gradient(180deg, ${hexToRgba(tint, 1)} 0%, ${hexToRgba(tint, 0.72)} 30%, ${hexToRgba(tint, 0.38)} 62%, #0a0a0a 100%)`;
}

/** Full-bleed wash so sport colour shows through photos. */
export function buildSportImageWash(
  tint: string,
  opacity = 0.34,
  mode: "light" | "dark" = "dark",
): string {
  const alpha = mode === "light" ? Math.min(opacity * 0.55, 0.22) : opacity;
  return hexToRgba(tint, alpha);
}

/** Edge colour wash over a photo (stronger at bottom for text). */
export function buildImageEdgeGradient(
  edgeColor: string,
  mode: "light" | "dark" = "dark",
): string {
  if (mode === "light") {
    return `linear-gradient(to top, ${hexToRgba(edgeColor, 0.48)} 0%, ${hexToRgba(edgeColor, 0.16)} 42%, transparent 72%)`;
  }
  return `linear-gradient(to top, ${hexToRgba(edgeColor, 0.58)} 0%, ${hexToRgba(edgeColor, 0.22)} 45%, transparent 72%)`;
}

export const POST_CARD_DARK_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.48) 42%, rgba(0,0,0,0.15) 100%)";

export const POST_CARD_LIGHT_SCRIM =
  "linear-gradient(to top, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.52) 42%, rgba(255,255,255,0.1) 100%)";

export const POST_CARD_HOME_DARK_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.38) 48%, rgba(0,0,0,0.08) 100%)";

export const POST_CARD_HOME_LIGHT_SCRIM =
  "linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.42) 48%, rgba(255,255,255,0.06) 100%)";

export function resolveCardScrim(
  mode: "light" | "dark" = "dark",
  variant: "feed" | "home" = "feed",
  tint?: string,
): string {
  if (mode === "light" && tint) {
    const bottom = variant === "home" ? 0.46 : 0.52;
    return `linear-gradient(to top, ${hexToRgba(tint, bottom)} 0%, ${hexToRgba(tint, 0.16)} 44%, transparent 72%)`;
  }
  if (variant === "home") {
    return mode === "light" ? POST_CARD_HOME_LIGHT_SCRIM : POST_CARD_HOME_DARK_SCRIM;
  }
  return mode === "light" ? POST_CARD_LIGHT_SCRIM : POST_CARD_DARK_SCRIM;
}

export function cardPhotoBase(mode: "light" | "dark" = "dark"): string {
  return mode === "light" ? "#f0f0f0" : "#0a0a0a";
}

export function noImageBottomFade(mode: "light" | "dark" = "dark", tint?: string): string {
  if (mode === "light" && tint) {
    return `linear-gradient(to top, ${hexToRgba(tint, 0.38)} 0%, transparent 58%)`;
  }
  return mode === "light"
    ? "linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 55%)"
    : "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)";
}

/** Soft radial glow for cards without a cover photo. */
export function buildNoImageRadialGlow(tint: string, mode: "light" | "dark"): string {
  if (mode === "light") {
    const light = resolveLightTint(tint);
    return `radial-gradient(circle at 50% 36%, ${hexToRgba(tint, 0.38)} 0%, ${light} 58%, transparent 100%)`;
  }
  return `radial-gradient(circle at 50% 36%, ${hexToRgba(tint, 0.62)} 0%, ${hexToRgba(tint, 0.18)} 52%, transparent 88%)`;
}

/** Subtle diagonal texture so empty cards feel intentional. */
export function buildNoImageStripeTexture(tint: string, mode: "light" | "dark"): string {
  const alpha = mode === "light" ? 0.07 : 0.1;
  return `repeating-linear-gradient(135deg, ${hexToRgba(tint, alpha)} 0px, ${hexToRgba(tint, alpha)} 1px, transparent 1px, transparent 11px)`;
}

export function postCardTintGradient(opts: Parameters<typeof resolvePostCardTint>[0]): string {
  return buildTintCardBackground(resolvePostCardTint(opts));
}
