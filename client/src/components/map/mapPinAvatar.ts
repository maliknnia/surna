import type { MapPin } from "./InteractiveMap";

const TYPE_EMOJI: Record<MapPin["type"], string> = {
  event: "📅",
  place: "🏟",
  team: "👥",
  coach: "🏅",
  person: "👤",
  player: "👤",
  challenge: "🏆",
  instant: "⚡",
  saved: "⭐",
};

const TYPE_ACCENT: Record<MapPin["type"], string> = {
  event: "#E64A19",
  place: "#5C6BC0",
  team: "#43A047",
  coach: "#FFB300",
  person: "#1E88E5",
  player: "#1E88E5",
  challenge: "#AB47BC",
  instant: "#00ACC1",
  saved: "#FFC107",
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Best circular avatar / logo for a map pin (Snap Map–style). */
export function resolveMapPinAvatarUrl(pin: MapPin): string | null {
  const d = pin.data || {};
  const candidates = [
    pin.iconUrl,
    d.profileImageUrl,
    d.avatarUrl,
    d.logo,
    d.logoUrl,
    pin.coverUrl,
    d.coverImageUrl,
    d.coverUrl,
    d.coverImage,
    d.imageUrl,
    d.photoUrl,
    d.bannerUrl,
  ];
  const url = candidates.find((u) => typeof u === "string" && u.trim().length > 0);
  return url?.trim() || null;
}

export function mapPinInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase() || "?";
}

export function mapPinTypeEmoji(type: MapPin["type"]): string {
  return TYPE_EMOJI[type] ?? "📍";
}

export function mapPinTypeAccent(type: MapPin["type"]): string {
  return TYPE_ACCENT[type] ?? "#555555";
}

/** Snapchat-style map avatar — circular photo, ground shadow, optional story ring. */
export function mapSnapAvatarMarkup(opts: {
  src?: string | null;
  initials: string;
  emoji?: string;
  type: MapPin["type"];
  size?: number;
  focused?: boolean;
  storyState?: MapPin["storyState"];
  presence?: MapPin["presence"];
}): string {
  const base = opts.size ?? 40;
  const size = opts.focused ? base + 4 : base;
  const story =
    opts.storyState && opts.storyState !== "none" ? `surna-story-${opts.storyState}` : "";
  const accent = mapPinTypeAccent(opts.type);
  const presence =
    opts.presence && opts.presence !== "offline"
      ? `<span class="surna-spot-presence surna-presence-${opts.presence}" aria-hidden="true"></span>`
      : "";

  const inner = opts.src
    ? `<img src="${escapeHtml(opts.src)}" alt="" class="surna-spot-avatar-img" loading="lazy" />`
    : [
        `<span class="surna-spot-avatar-fallback" style="background:linear-gradient(145deg,${accent},${accent}cc)">`,
        `<span class="surna-spot-avatar-emoji" aria-hidden="true">${opts.emoji ?? mapPinTypeEmoji(opts.type)}</span>`,
        `<span class="surna-spot-avatar-initials">${escapeHtml(opts.initials)}</span>`,
        `</span>`,
      ].join("");

  return [
    `<div class="surna-snap-avatar surna-snap-type-${opts.type} ${story} ${opts.focused ? "surna-snap-avatar--focused" : ""}">`,
    `<div class="surna-snap-avatar-shadow" aria-hidden="true"></div>`,
    `<div class="surna-snap-avatar-ring">`,
    `<div class="surna-spot-avatar" style="width:${size}px;height:${size}px">`,
    inner,
    presence,
    `</div>`,
    `</div>`,
    `</div>`,
  ].join("");
}
