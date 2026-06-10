import type { MapPin } from "./InteractiveMap";

import locationPinBold from "../../assets/map-icons/location-pin-bold.svg?raw";
import soccerPlayer from "../../assets/map-icons/03-soccer-player.svg?raw";
import eventSign from "../../assets/map-icons/04-event-sign.svg?raw";
import eventBanner from "../../assets/map-icons/05-event-banner.svg?raw";
import coachOutline from "../../assets/map-icons/coach-outline.svg?raw";
import americanFootball from "../../assets/map-icons/09-american-football.svg?raw";
import footballPlayer from "../../assets/map-icons/11-football-player.svg?raw";

const PIN_ART: Record<Exclude<MapPin["type"], "place" | "saved">, string> = {
  event: eventSign,
  coach: coachOutline,
  player: footballPlayer,
  person: soccerPlayer,
  team: americanFootball,
  challenge: eventBanner,
  instant: footballPlayer,
};

function svgInner(raw: string): string {
  const match = raw.trim().match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return match ? match[1].trim() : raw;
}

/** Bold map pin for venues / places — filled teardrop, hollow center dot. */
function wrapLocationPin(size: number, focused = false): string {
  const stroke = focused ? 3.5 : 3;
  const inner = svgInner(locationPinBold).replace(
    /stroke-width="[^"]*"/,
    `stroke-width="${stroke}"`,
  );
  return `<svg class="surna-spot-svg surna-map-pin-art surna-map-pin-location" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function strokeOnlyInner(inner: string): string {
  return inner
    .replace(/\sfill="(?!none)[^"]*"/gi, ' fill="none"')
    .replace(/<polygon\b[^>]*\/>/gi, "");
}

function wrapTypeIcon(raw: string, size: number, focused = false): string {
  const inner = strokeOnlyInner(svgInner(raw));
  const stroke = focused ? 26 : 22;
  return `<svg class="surna-spot-svg surna-map-pin-art surna-map-pin-stroke" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

export function mapPinIconSvg(
  type: MapPin["type"],
  size = 22,
  focused = false,
): string {
  if (type === "place") {
    return wrapLocationPin(size, focused);
  }
  if (type === "saved") {
    return `<svg class="surna-spot-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="#FFD60A" stroke="#FFD60A" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  }
  const raw = PIN_ART[type] ?? eventSign;
  return wrapTypeIcon(raw, size, focused);
}

/** Location pin for cluster badges (same art as place pins). */
export function mapLocationPinSvg(size = 16, focused = false): string {
  return wrapLocationPin(size, focused);
}

export function mapUserIconSvg(): string {
  return "";
}
