import L from "leaflet";
import type { MapPin } from "./InteractiveMap";
import {
  mapPinInitials,
  mapSnapAvatarMarkup,
  resolveMapPinAvatarUrl,
} from "./mapPinAvatar";

function escapeHtml(s: string): string {
  const text = s == null ? "" : String(s);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PIN_AVATAR_RING_CLASS: Partial<Record<MapPin["type"], string>> = {
  event: "surna-spot-avatar-ring-event",
  instant: "surna-spot-avatar-ring-instant",
  challenge: "surna-spot-avatar-ring-challenge",
  place: "surna-spot-avatar-ring-place",
  team: "surna-spot-avatar-ring-team",
  coach: "surna-spot-avatar-ring-coach",
  person: "surna-spot-avatar-ring-person",
  player: "surna-spot-avatar-ring-player",
};

/** Matches `.surna-spot-avatar-ring-*` border colours in index.css */
const PIN_BORDER_COLOR: Record<MapPin["type"], string> = {
  event: "#CC6B4A",
  instant: "#CC6B4A",
  challenge: "#CC6B4A",
  place: "#C8C8C8",
  team: "#B8860B",
  coach: "#B8860B",
  person: "#803FE1",
  player: "#803FE1",
  saved: "#FFC107",
};

const PIN_TYPE_LABEL: Record<MapPin["type"], string> = {
  event: "Event",
  place: "Venue",
  team: "Team",
  coach: "Coach",
  person: "Player",
  player: "Player",
  challenge: "Challenge",
  instant: "Pick-up game",
  saved: "Saved",
};

const LABEL_NAME_STYLE =
  "color:#fff;background:none;padding:0;border-radius:0;text-shadow:0 1px 3px rgba(0,0,0,0.85)";
const LABEL_KIND_STYLE =
  "background:none;padding:0;border-radius:0;text-shadow:0 1px 2px rgba(0,0,0,0.75)";

function pinPointerMarkup(borderColor: string): string {
  return `<span class="surna-spot-pin-pointer" style="border-top-color:${borderColor}" aria-hidden="true"></span>`;
}

function pinLabelsMarkup(pin: MapPin, borderColor: string): string {
  const typeLabel = PIN_TYPE_LABEL[pin.type] || pin.type;
  return [
    `<div class="surna-spot-labels">`,
    `<span class="surna-spot-name" style="${LABEL_NAME_STYLE}">${escapeHtml(pin.title)}</span>`,
    `<span class="surna-spot-kind" style="color:${borderColor};${LABEL_KIND_STYLE}">${escapeHtml(typeLabel)}</span>`,
    `</div>`,
  ].join("");
}

function applyPinAvatarRingClass(markup: string, type: MapPin["type"]): string {
  const ringClass = PIN_AVATAR_RING_CLASS[type];
  if (!ringClass) return markup;
  return markup.replace('class="surna-spot-avatar"', `class="surna-spot-avatar ${ringClass}"`);
}

/** All map entities use Snap Map–style circular avatars. */
export function createSurnaMarker(
  pin: MapPin,
  isFocused = false,
  _zoom = 15,
): L.DivIcon {
  const iconSize = isFocused ? 44 : 40;
  const avatarUrl = resolveMapPinAvatarUrl(pin);
  const focusClass = isFocused ? "surna-spot-focused" : "";
  const activeClass = pin.presence === "active" ? "surna-spot-active" : "";
  const teammateClass = pin.highlightTeammate ? "surna-spot-teammate" : "";
  const borderColor = isFocused ? "#ffe566" : PIN_BORDER_COLOR[pin.type];

  const graphic = [
    `<div class="surna-spot-graphic surna-spot-graphic--avatar">`,
    `<div style="display:flex;flex-direction:column;align-items:center">`,
    applyPinAvatarRingClass(
      mapSnapAvatarMarkup({
        src: avatarUrl,
        initials: mapPinInitials(pin.title),
        type: pin.type,
        size: iconSize,
        focused: isFocused,
        storyState: pin.storyState,
        presence: pin.presence,
      }),
      pin.type,
    ),
    pinPointerMarkup(borderColor),
    `</div>`,
    `</div>`,
  ].join("");

  const html = [
    `<div class="surna-spot surna-type-${pin.type} surna-spot--avatar ${activeClass} ${focusClass} ${teammateClass}" data-type="${pin.type}" aria-label="${escapeHtml(pin.title)}">`,
    graphic,
    pinLabelsMarkup(pin, borderColor),
    `</div>`,
  ].join("");

  const pointerH = 10;
  const graphicH = iconSize + 6 + pointerH;
  const labelsH = 26;
  const graphicW = iconSize;
  const iconW = Math.max(graphicW, 108);
  const iconH = graphicH + 4 + labelsH;
  const anchorX = iconW / 2;
  const anchorY = graphicH;

  return new L.DivIcon({
    html,
    className: isFocused ? "surna-marker-wrap surna-marker-wrap-focused" : "surna-marker-wrap",
    iconSize: [iconW, iconH],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY - 2],
  });
}

export function createSurnaUserMarker(options?: {
  ghostMode?: boolean;
  showActiveStatus?: boolean;
  avatarUrl?: string | null;
  initials?: string;
}): L.DivIcon {
  const ghost = options?.ghostMode;
  const active = options?.showActiveStatus;
  const ghostClass = ghost ? " surna-you--ghost" : "";
  const size = 36;

  if (options?.avatarUrl && !ghost) {
    const html = [
      `<div class="surna-you surna-you--avatar${ghostClass}">`,
      mapSnapAvatarMarkup({
        src: options.avatarUrl,
        initials: options.initials || "ME",
        type: "person",
        size,
        focused: true,
        presence: active ? "active" : undefined,
      }),
      `</div>`,
    ].join("");
    return new L.DivIcon({
      html,
      className: "surna-you-wrap",
      iconSize: [size, size + 6],
      iconAnchor: [size / 2, size + 6],
    });
  }

  const activeDot =
    active && !ghost ? `<span class="surna-you-active" aria-hidden="true"></span>` : "";
  return new L.DivIcon({
    html: `<div class="surna-you${ghostClass}"><div class="surna-you-ring" aria-hidden="true"></div><div class="surna-you-dot" aria-hidden="true"></div>${activeDot}</div>`,
    className: "surna-you-wrap",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function createSurnaClusterIcon(count: number, hasStory: boolean): L.DivIcon {
  const story = hasStory ? "surna-cluster-story" : "";
  const label = count >= 100 ? "99+" : String(count);
  return new L.DivIcon({
    html: `<div class="surna-cluster surna-cluster--avatar ${story}"><span class="surna-cluster-count">${label}</span></div>`,
    className: "surna-cluster-wrap",
    iconSize: new L.Point(36, 36),
    iconAnchor: new L.Point(18, 18),
  });
}
