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

export type PostCardLightSurface = {
  top: string;
  mid: string;
  bottom: string;
  text: string;
};

/**
 * Light-mode card palette — soft sport pastels only.
 * Never reuse dark tints at high alpha (that reads muddy on light UI).
 */
export const POST_CARD_LIGHT_SURFACES: Record<keyof typeof POST_CARD_TINTS, PostCardLightSurface> = {
  football: { top: "#e8f4ec", mid: "#cce8d8", bottom: "#aed8c4", text: "#1a3d28" },
  basketball: { top: "#faf0e6", mid: "#f0dcc4", bottom: "#e0c4a0", text: "#4a2a10" },
  gaa: { top: "#e6f4ec", mid: "#c8e8d8", bottom: "#aad4c0", text: "#1a3528" },
  rugby: { top: "#e8eef8", mid: "#ccd8f0", bottom: "#afc0e0", text: "#1e2848" },
  running: { top: "#e6f4ee", mid: "#c8e8dc", bottom: "#aad8c8", text: "#1a3328" },
  crossfit: { top: "#f8ece8", mid: "#ecd0c4", bottom: "#dab4a4", text: "#3d2018" },
  tennis: { top: "#e6f4e6", mid: "#c8e8c8", bottom: "#aad8aa", text: "#1a3020" },
  swimming: { top: "#e6eef8", mid: "#c8d8f0", bottom: "#aac4e0", text: "#1a2838" },
  mma: { top: "#f8e8e8", mid: "#f0c8c8", bottom: "#e0a8a8", text: "#3d1818" },
  challenge: { top: "#f8e8ee", mid: "#f0c8d8", bottom: "#e0a8c0", text: "#3d1a28" },
  coach: { top: "#f6f2e0", mid: "#ece4c0", bottom: "#ddd0a0", text: "#3d3810" },
  default: { top: "#f0f0f0", mid: "#e0e0e0", bottom: "#d0d0d0", text: "#242424" },
};

export function resolveLightSurface(darkTint: string): PostCardLightSurface {
  for (const key of Object.keys(POST_CARD_TINTS) as Array<keyof typeof POST_CARD_TINTS>) {
    if (POST_CARD_TINTS[key] === darkTint) return POST_CARD_LIGHT_SURFACES[key];
  }
  return POST_CARD_LIGHT_SURFACES.default;
}

/** @deprecated Use resolveLightSurface — kept for callers expecting a single hex. */
export function resolveLightTint(darkTint: string): string {
  return resolveLightSurface(darkTint).mid;
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
    const surface = resolveLightSurface(tint);
    return `linear-gradient(180deg, ${surface.top} 0%, ${surface.mid} 52%, ${surface.bottom} 100%)`;
  }
  return `linear-gradient(180deg, ${hexToRgba(tint, 1)} 0%, ${hexToRgba(tint, 0.72)} 30%, ${hexToRgba(tint, 0.38)} 62%, #0a0a0a 100%)`;
}

/** Full-bleed wash so sport colour shows through photos. */
export function buildSportImageWash(
  tint: string,
  opacity = 0.34,
  mode: "light" | "dark" = "dark",
): string {
  if (mode === "light") {
    const surface = resolveLightSurface(tint);
    return hexToRgba(surface.mid, Math.min(opacity * 0.28, 0.1));
  }
  return hexToRgba(tint, opacity);
}

/** Edge colour wash over a photo (stronger at bottom for text). */
export function buildImageEdgeGradient(
  edgeColor: string,
  mode: "light" | "dark" = "dark",
  sportTint?: string,
): string {
  if (mode === "light") {
    const surface = sportTint ? resolveLightSurface(sportTint) : resolveLightSurface(edgeColor);
    return `linear-gradient(to top, ${hexToRgba(surface.bottom, 0.72)} 0%, ${hexToRgba(surface.mid, 0.22)} 36%, transparent 62%)`;
  }
  return `linear-gradient(to top, ${hexToRgba(edgeColor, 0.42)} 0%, ${hexToRgba(edgeColor, 0.16)} 45%, transparent 72%)`;
}

export const POST_CARD_DARK_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.48) 42%, rgba(0,0,0,0.15) 100%)";

export const POST_CARD_HOME_DARK_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 48%, rgba(0,0,0,0.05) 100%)";

/** Light-mode photo cards: soft dark fade only — never a white/pastel wash over the image. */
export function buildLightPhotoScrim(_tint: string, variant: "feed" | "home"): string {
  if (variant === "home") {
    return "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 42%, transparent 72%)";
  }
  return "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.22) 40%, transparent 70%)";
}

export function resolveCardScrim(
  mode: "light" | "dark" = "dark",
  variant: "feed" | "home" = "feed",
  tint?: string,
): string {
  if (mode === "light") {
    return buildLightPhotoScrim(tint || POST_CARD_TINTS.default, variant);
  }
  if (variant === "home") {
    return POST_CARD_HOME_DARK_SCRIM;
  }
  return POST_CARD_DARK_SCRIM;
}

export function cardPhotoBase(mode: "light" | "dark" = "dark"): string {
  return mode === "light" ? "#f0f0f0" : "#0a0a0a";
}

export function noImageBottomFade(mode: "light" | "dark" = "dark", tint?: string): string {
  if (mode === "light" && tint) {
    const surface = resolveLightSurface(tint);
    return `linear-gradient(to top, ${hexToRgba(surface.bottom, 0.5)} 0%, transparent 56%)`;
  }
  return mode === "light"
    ? "linear-gradient(to top, rgba(0,0,0,0.12) 0%, transparent 55%)"
    : "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)";
}

/** Soft radial glow for cards without a cover photo. */
export function buildNoImageRadialGlow(tint: string, mode: "light" | "dark"): string {
  if (mode === "light") {
    const surface = resolveLightSurface(tint);
    return `radial-gradient(circle at 50% 38%, ${surface.mid} 0%, ${surface.top} 62%, ${surface.top} 100%)`;
  }
  return `radial-gradient(circle at 50% 36%, ${hexToRgba(tint, 0.62)} 0%, ${hexToRgba(tint, 0.18)} 52%, transparent 88%)`;
}

/** Subtle diagonal texture so empty cards feel intentional. */
export function buildNoImageStripeTexture(tint: string, mode: "light" | "dark"): string {
  if (mode === "light") {
    const surface = resolveLightSurface(tint);
    return `repeating-linear-gradient(135deg, ${hexToRgba(surface.bottom, 0.12)} 0px, ${hexToRgba(surface.bottom, 0.12)} 1px, transparent 1px, transparent 11px)`;
  }
  return `repeating-linear-gradient(135deg, ${hexToRgba(tint, 0.1)} 0px, ${hexToRgba(tint, 0.1)} 1px, transparent 1px, transparent 11px)`;
}

export function postCardTintGradient(opts: Parameters<typeof resolvePostCardTint>[0]): string {
  return buildTintCardBackground(resolvePostCardTint(opts));
}
