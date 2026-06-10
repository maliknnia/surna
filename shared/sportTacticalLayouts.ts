/**
 * Sport-specific tactical boards — normalized 0–100 coords (x: left→right, y: top→opponent end).
 * Drag interaction matches FIFA-style boards: pointer capture + absolute-position tokens on SVG surface.
 */

export type SportTacticalLayoutId =
  | "football"
  | "gaa"
  | "basketball"
  | "rugby"
  | "volleyball"
  | "handball"
  | "water_polo"
  | "hockey"
  | "cricket"
  | "american_football"
  | "baseball"
  | "tennis";

export type SlotTemplate = { role: string; x: number; y: number };

export type TacticalFormationDef = {
  key: string;
  label: string;
  layoutId: SportTacticalLayoutId;
  slots: SlotTemplate[];
};

export type LayoutMeta = {
  id: SportTacticalLayoutId;
  label: string;
  /** CSS aspect-ratio, e.g. "68 / 105" */
  aspectRatio: string;
  surfaceLabel: string;
};

const FOOTBALL_433: SlotTemplate[] = [
  { role: "GK", x: 50, y: 90 },
  { role: "LB", x: 12, y: 72 },
  { role: "CB", x: 36, y: 74 },
  { role: "CB", x: 64, y: 74 },
  { role: "RB", x: 88, y: 72 },
  { role: "CM", x: 22, y: 50 },
  { role: "CM", x: 50, y: 48 },
  { role: "CM", x: 78, y: 50 },
  { role: "LW", x: 18, y: 22 },
  { role: "ST", x: 50, y: 18 },
  { role: "RW", x: 82, y: 22 },
];

const FOOTBALL_442: SlotTemplate[] = [
  { role: "GK", x: 50, y: 90 },
  { role: "LB", x: 12, y: 72 },
  { role: "CB", x: 36, y: 74 },
  { role: "CB", x: 64, y: 74 },
  { role: "RB", x: 88, y: 72 },
  { role: "LM", x: 15, y: 50 },
  { role: "CM", x: 38, y: 48 },
  { role: "CM", x: 62, y: 48 },
  { role: "RM", x: 85, y: 50 },
  { role: "ST", x: 38, y: 20 },
  { role: "ST", x: 62, y: 20 },
];

const FOOTBALL_352: SlotTemplate[] = [
  { role: "GK", x: 50, y: 90 },
  { role: "CB", x: 25, y: 76 },
  { role: "CB", x: 50, y: 78 },
  { role: "CB", x: 75, y: 76 },
  { role: "LWB", x: 10, y: 55 },
  { role: "CM", x: 30, y: 52 },
  { role: "CM", x: 50, y: 50 },
  { role: "CM", x: 70, y: 52 },
  { role: "RWB", x: 90, y: 55 },
  { role: "ST", x: 38, y: 22 },
  { role: "ST", x: 62, y: 22 },
];

const FOOTBALL_4231: SlotTemplate[] = [
  { role: "GK", x: 50, y: 90 },
  { role: "LB", x: 12, y: 72 },
  { role: "CB", x: 36, y: 74 },
  { role: "CB", x: 64, y: 74 },
  { role: "RB", x: 88, y: 72 },
  { role: "CDM", x: 38, y: 58 },
  { role: "CDM", x: 62, y: 58 },
  { role: "LAM", x: 20, y: 35 },
  { role: "CAM", x: 50, y: 32 },
  { role: "RAM", x: 80, y: 35 },
  { role: "ST", x: 50, y: 18 },
];

const GAA_15: SlotTemplate[] = [
  { role: "GK", x: 50, y: 92 },
  { role: "FB", x: 18, y: 80 },
  { role: "FB", x: 50, y: 82 },
  { role: "FB", x: 82, y: 80 },
  { role: "HB", x: 22, y: 66 },
  { role: "HB", x: 50, y: 68 },
  { role: "HB", x: 78, y: 66 },
  { role: "MF", x: 35, y: 50 },
  { role: "MF", x: 65, y: 50 },
  { role: "HF", x: 22, y: 34 },
  { role: "HF", x: 50, y: 36 },
  { role: "HF", x: 78, y: 34 },
  { role: "FF", x: 18, y: 18 },
  { role: "FF", x: 50, y: 16 },
  { role: "FF", x: 82, y: 18 },
];

export const LAYOUT_META: Record<SportTacticalLayoutId, LayoutMeta> = {
  football: { id: "football", label: "Football pitch", aspectRatio: "68 / 105", surfaceLabel: "Pitch" },
  gaa: { id: "gaa", label: "GAA pitch", aspectRatio: "16 / 10", surfaceLabel: "Pitch" },
  basketball: { id: "basketball", label: "Basketball court", aspectRatio: "28 / 15", surfaceLabel: "Court" },
  rugby: { id: "rugby", label: "Rugby pitch", aspectRatio: "68 / 100", surfaceLabel: "Pitch" },
  volleyball: { id: "volleyball", label: "Volleyball court", aspectRatio: "18 / 9", surfaceLabel: "Court" },
  handball: { id: "handball", label: "Handball court", aspectRatio: "40 / 20", surfaceLabel: "Court" },
  water_polo: { id: "water_polo", label: "Water polo pool", aspectRatio: "30 / 20", surfaceLabel: "Pool" },
  hockey: { id: "hockey", label: "Hockey pitch", aspectRatio: "55 / 91", surfaceLabel: "Pitch" },
  cricket: { id: "cricket", label: "Cricket field", aspectRatio: "1 / 1", surfaceLabel: "Field" },
  american_football: { id: "american_football", label: "American football field", aspectRatio: "53 / 120", surfaceLabel: "Field" },
  baseball: { id: "baseball", label: "Baseball diamond", aspectRatio: "1 / 1", surfaceLabel: "Field" },
  tennis: { id: "tennis", label: "Tennis court", aspectRatio: "36 / 78", surfaceLabel: "Court" },
};

export const TACTICAL_FORMATIONS: TacticalFormationDef[] = [
  { key: "4-3-3", label: "4-3-3", layoutId: "football", slots: FOOTBALL_433 },
  { key: "4-4-2", label: "4-4-2", layoutId: "football", slots: FOOTBALL_442 },
  { key: "3-5-2", label: "3-5-2", layoutId: "football", slots: FOOTBALL_352 },
  { key: "4-2-3-1", label: "4-2-3-1", layoutId: "football", slots: FOOTBALL_4231 },
  { key: "gaa-15", label: "GAA 15", layoutId: "gaa", slots: GAA_15 },
  {
    key: "bb-5-out",
    label: "5-out motion",
    layoutId: "basketball",
    slots: [
      { role: "PG", x: 50, y: 82 },
      { role: "SG", x: 18, y: 68 },
      { role: "SF", x: 82, y: 68 },
      { role: "PF", x: 28, y: 42 },
      { role: "C", x: 50, y: 28 },
    ],
  },
  {
    key: "bb-horns",
    label: "Horns set",
    layoutId: "basketball",
    slots: [
      { role: "PG", x: 50, y: 78 },
      { role: "SG", x: 15, y: 55 },
      { role: "SF", x: 85, y: 55 },
      { role: "PF", x: 38, y: 48 },
      { role: "C", x: 62, y: 48 },
    ],
  },
  {
    key: "rg-15",
    label: "1-3-3-1",
    layoutId: "rugby",
    slots: [
      { role: "15", x: 50, y: 88 },
      { role: "11", x: 12, y: 72 },
      { role: "12", x: 32, y: 70 },
      { role: "13", x: 68, y: 70 },
      { role: "14", x: 88, y: 72 },
      { role: "8", x: 25, y: 52 },
      { role: "9", x: 50, y: 50 },
      { role: "10", x: 75, y: 52 },
      { role: "1", x: 18, y: 32 },
      { role: "2", x: 38, y: 28 },
      { role: "3", x: 50, y: 26 },
      { role: "4", x: 62, y: 28 },
      { role: "5", x: 82, y: 32 },
      { role: "6", x: 35, y: 38 },
      { role: "7", x: 65, y: 38 },
    ],
  },
  {
    key: "vb-6-2",
    label: "6-2 rotation",
    layoutId: "volleyball",
    slots: [
      { role: "S", x: 72, y: 78 },
      { role: "OH1", x: 28, y: 78 },
      { role: "MB1", x: 50, y: 78 },
      { role: "OPP", x: 72, y: 62 },
      { role: "OH2", x: 28, y: 62 },
      { role: "MB2", x: 50, y: 62 },
    ],
  },
  {
    key: "hb-6-0",
    label: "6-0 defense",
    layoutId: "handball",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LW", x: 15, y: 55 },
      { role: "LB", x: 32, y: 62 },
      { role: "CB", x: 50, y: 58 },
      { role: "RB", x: 68, y: 62 },
      { role: "RW", x: 85, y: 55 },
      { role: "P", x: 50, y: 38 },
    ],
  },
  {
    key: "wp-7",
    label: "Standard 7",
    layoutId: "water_polo",
    slots: [
      { role: "GK", x: 50, y: 85 },
      { role: "D1", x: 22, y: 62 },
      { role: "D2", x: 50, y: 65 },
      { role: "D3", x: 78, y: 62 },
      { role: "CF", x: 50, y: 42 },
      { role: "W1", x: 25, y: 38 },
      { role: "W2", x: 75, y: 38 },
    ],
  },
  {
    key: "hk-4-3-3",
    label: "4-3-3 press",
    layoutId: "hockey",
    slots: FOOTBALL_433,
  },
  {
    key: "cr-field",
    label: "Field set",
    layoutId: "cricket",
    slots: [
      { role: "WK", x: 50, y: 52 },
      { role: "B1", x: 50, y: 48 },
      { role: "B2", x: 55, y: 50 },
      { role: "F-Slip", x: 58, y: 54 },
      { role: "F-Mid", x: 42, y: 58 },
      { role: "F-Cover", x: 35, y: 52 },
      { role: "F-Point", x: 62, y: 48 },
      { role: "F-Third", x: 38, y: 45 },
      { role: "F-Fine", x: 48, y: 62 },
      { role: "F-Deep", x: 50, y: 72 },
      { role: "F-Leg", x: 52, y: 58 },
    ],
  },
  {
    key: "af-spread",
    label: "Spread offense",
    layoutId: "american_football",
    slots: [
      { role: "QB", x: 50, y: 72 },
      { role: "RB", x: 50, y: 78 },
      { role: "LT", x: 38, y: 68 },
      { role: "LG", x: 44, y: 68 },
      { role: "C", x: 50, y: 68 },
      { role: "RG", x: 56, y: 68 },
      { role: "RT", x: 62, y: 68 },
      { role: "WR1", x: 12, y: 68 },
      { role: "WR2", x: 88, y: 68 },
      { role: "WR3", x: 50, y: 48 },
      { role: "TE", x: 68, y: 66 },
    ],
  },
  {
    key: "bb-diamond",
    label: "Standard defense",
    layoutId: "baseball",
    slots: [
      { role: "P", x: 50, y: 50 },
      { role: "C", x: 50, y: 58 },
      { role: "1B", x: 62, y: 48 },
      { role: "2B", x: 55, y: 42 },
      { role: "SS", x: 45, y: 42 },
      { role: "3B", x: 38, y: 48 },
      { role: "LF", x: 22, y: 32 },
      { role: "CF", x: 50, y: 28 },
      { role: "RF", x: 78, y: 32 },
    ],
  },
  {
    key: "tn-doubles",
    label: "Doubles formation",
    layoutId: "tennis",
    slots: [
      { role: "P1", x: 35, y: 78 },
      { role: "P2", x: 65, y: 78 },
      { role: "P3", x: 35, y: 28 },
      { role: "P4", x: 65, y: 28 },
    ],
  },
  {
    key: "tn-singles",
    label: "Singles",
    layoutId: "tennis",
    slots: [
      { role: "You", x: 50, y: 78 },
      { role: "Opponent", x: 50, y: 22 },
    ],
  },
];

const DEFAULT_FORMATION_KEY: Record<SportTacticalLayoutId, string> = {
  football: "4-3-3",
  gaa: "gaa-15",
  basketball: "bb-5-out",
  rugby: "rg-15",
  volleyball: "vb-6-2",
  handball: "hb-6-0",
  water_polo: "wp-7",
  hockey: "hk-4-3-3",
  cricket: "cr-field",
  american_football: "af-spread",
  baseball: "bb-diamond",
  tennis: "tn-doubles",
};

export function getLayoutMeta(layoutId: SportTacticalLayoutId): LayoutMeta {
  return LAYOUT_META[layoutId];
}

export function getDefaultFormationKey(layoutId: SportTacticalLayoutId): string {
  return DEFAULT_FORMATION_KEY[layoutId];
}

export function getFormationsForLayout(layoutId: SportTacticalLayoutId): TacticalFormationDef[] {
  return TACTICAL_FORMATIONS.filter((f) => f.layoutId === layoutId);
}

export function getFormationDef(key: string): TacticalFormationDef {
  return TACTICAL_FORMATIONS.find((f) => f.key === key) ?? TACTICAL_FORMATIONS[0];
}

/** Map sport family → tactical surface (null = checklist-only match prep). */
export function layoutIdForSportFamily(
  family: string,
): SportTacticalLayoutId | null {
  const map: Record<string, SportTacticalLayoutId | null> = {
    football: "football",
    gaa: "gaa",
    basketball: "basketball",
    rugby: "rugby",
    volleyball: "volleyball",
    handball: "handball",
    water_polo: "water_polo",
    hockey: "hockey",
    cricket: "cricket",
    american_football: "american_football",
    baseball: "baseball",
    tennis: "tennis",
    combat: null,
    racquet: "tennis",
    individual: null,
    generic: null,
  };
  return map[family] ?? null;
}
