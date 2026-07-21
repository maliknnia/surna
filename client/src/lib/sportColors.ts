const sportColorMap: Record<string, { base: string; emoji: string }> = {
  boxing:       { base: "#C62828", emoji: "🥊" },
  mma:          { base: "#B71C1C", emoji: "🥋" },
  baseball:     { base: "#E65100", emoji: "⚾" },
  volleyball:   { base: "#F9A825", emoji: "🏐" },
  tennis:       { base: "#EF6C00", emoji: "🎾" },
  football:     { base: "#D84315", emoji: "⚽" },
  soccer:       { base: "#D84315", emoji: "⚽" },
  basketball:   { base: "#F57C00", emoji: "🏀" },
  swimming:     { base: "#E53935", emoji: "🏊" },
  rugby:        { base: "#C62828", emoji: "🏉" },
  cricket:      { base: "#FF8F00", emoji: "🏏" },
  hockey:       { base: "#E53935", emoji: "🏒" },
  golf:         { base: "#EF6C00", emoji: "⛳" },
  running:      { base: "#FF5722", emoji: "🏃" },
  cycling:      { base: "#E53935", emoji: "🚴" },
  wrestling:    { base: "#E64A19", emoji: "🤼" },
  gaa:          { base: "#E53935", emoji: "🏐" },
  hurling:      { base: "#FF7900", emoji: "🏑" },
  fitness:      { base: "#FF6B4B", emoji: "💪" },
  crossfit:     { base: "#E53935", emoji: "🏋️" },
  yoga:         { base: "#FF7043", emoji: "🧘" },
  martial_arts: { base: "#C62828", emoji: "🥋" },
  strength_training: { base: "#C62828", emoji: "💪" },
  strength:     { base: "#C62828", emoji: "💪" },
  cardio:       { base: "#FF5722", emoji: "🏃" },
  pilates:      { base: "#FF7043", emoji: "🧘" },
  hiit:         { base: "#FF3D00", emoji: "🔥" },
  weightlifting: { base: "#E64A19", emoji: "🏋️" },
  track_and_field: { base: "#FF6E40", emoji: "🏃" },
  jiu_jitsu:    { base: "#C62828", emoji: "🥋" },
  bjj:          { base: "#C62828", emoji: "🥋" },
  karate:       { base: "#C62828", emoji: "🥋" },
  taekwondo:    { base: "#E53935", emoji: "🥋" },
  judo:         { base: "#E53935", emoji: "🥋" },
  muay_thai:    { base: "#C62828", emoji: "🥊" },
  kickboxing:   { base: "#C62828", emoji: "🥊" },
  surfing:      { base: "#FF5722", emoji: "🏄" },
  skateboarding: { base: "#E64A19", emoji: "🛹" },
  climbing:     { base: "#FF5722", emoji: "🧗" },
  rock_climbing: { base: "#FF5722", emoji: "🧗" },
  dance:        { base: "#E84D60", emoji: "💃" },
  gymnastics:   { base: "#EF5350", emoji: "🤸" },
  rowing:       { base: "#E53935", emoji: "🚣" },
  badminton:    { base: "#FFA726", emoji: "🏸" },
  table_tennis: { base: "#FF8F00", emoji: "🏓" },
  ping_pong:    { base: "#FF8F00", emoji: "🏓" },
  lacrosse:     { base: "#FF6F00", emoji: "🥍" },
  fencing:      { base: "#E53935", emoji: "🤺" },
  archery:      { base: "#EF6C00", emoji: "🏹" },
  skiing:       { base: "#FF5722", emoji: "⛷️" },
  snowboarding: { base: "#FF7043", emoji: "🏂" },
  handball:     { base: "#FF6F00", emoji: "🤾" },
  water_polo:   { base: "#E53935", emoji: "🤽" },
};

const DEFAULT_COLOR = "#C62828";
const DEFAULT_EMOJI = "🏆";

function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function lighten(hex: string, amount: number): string {
  const [h, s, l] = hexToHSL(hex);
  return hslToHex(h, Math.max(s - 2, 0), Math.min(l + amount, 58));
}

function darken(hex: string, amount: number): string {
  const [h, s, l] = hexToHSL(hex);
  // Keep dark-mode fills brighter than before (avoid muddy browns)
  return hslToHex(h, Math.min(s + 2, 100), Math.max(l - amount, 36));
}

export interface SportColorResult {
  base: string;
  light: string;
  dark: string;
  emoji: string;
}

export function getSportColor(sport: string | null | undefined): SportColorResult {
  if (!sport) {
    return { base: DEFAULT_COLOR, light: lighten(DEFAULT_COLOR, 8), dark: darken(DEFAULT_COLOR, 10), emoji: DEFAULT_EMOJI };
  }
  const key = sport.toLowerCase().replace(/[\s\-\.]/g, "_");
  const entry = sportColorMap[key];
  if (entry) {
    return { base: entry.base, light: lighten(entry.base, 8), dark: darken(entry.base, 10), emoji: entry.emoji };
  }
  for (const [mapKey, val] of Object.entries(sportColorMap)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return { base: val.base, light: lighten(val.base, 8), dark: darken(val.base, 10), emoji: val.emoji };
    }
  }
  return { base: DEFAULT_COLOR, light: lighten(DEFAULT_COLOR, 8), dark: darken(DEFAULT_COLOR, 10), emoji: DEFAULT_EMOJI };
}

export function sportCardBg(sport: string | null | undefined, mode: "light" | "dark"): string {
  const c = getSportColor(sport);
  return mode === "light" ? c.light : c.dark;
}

export function sportCardGradient(sport: string | null | undefined, mode: "light" | "dark"): string {
  const c = getSportColor(sport);
  // Solid fill — matches event discovery cards (no gradient wash)
  return mode === "light" ? c.light : c.dark;
}

/** Map venue category/kind → sport key for the same card tints as TeamCard */
const venueCategorySportKey: Record<string, string> = {
  gym: "fitness",
  fitness: "fitness",
  court: "basketball",
  field: "soccer",
  stadium: "football",
  arena: "basketball",
  pool: "swimming",
  track: "running",
  studio: "yoga",
  rink: "hockey",
  martial_arts: "martial_arts",
  crossfit: "crossfit",
  "gaa_pitch": "gaa",
  "gaa-pitch": "gaa",
  "rugby_pitch": "rugby",
  "rugby-pitch": "rugby",
  "cricket_pitch": "cricket",
  "cricket-pitch": "cricket",
};

export function venueCardBg(
  place: { category?: string; kind?: string; sports?: string[] },
  mode: "light" | "dark",
): string {
  const firstSport = place.sports?.[0];
  if (firstSport) return sportCardBg(firstSport, mode);
  const cat = (place.category || place.kind || "").toLowerCase().replace(/[\s-]/g, "_");
  const mapped = venueCategorySportKey[cat];
  if (mapped) return sportCardBg(mapped, mode);
  return sportCardBg(null, mode);
}
