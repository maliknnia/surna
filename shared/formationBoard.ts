/**
 * Formation board contract (Phase 3 Option C).
 * Geometry lives on pro_formations.layout_json; match squads link via formation_id.
 */

import {
  getDefaultFormationKey,
  getFormationsForLayout,
  layoutIdForSportFamily,
  type SportTacticalLayoutId,
  type TacticalFormationDef,
} from "./sportTacticalLayouts";
import { resolveSportFamily } from "./proSportProfiles";

export type FormationLayoutConfigValue = "football-grid" | "gaa-lines" | string | null;

export type FormationBoardPlayer = {
  playerId?: string;
  userId?: string;
  name: string;
  number: number;
  role: string;
  /** 0–100, left → right */
  x: number;
  /** 0–100, top → opponent end */
  y: number;
  note?: string;
};

/** Canonical document stored in pro_formations.layout_json */
export type FormationLayoutJson = {
  formationKey: string;
  layoutId: SportTacticalLayoutId;
  archetypeKey?: string;
  players: FormationBoardPlayer[];
  /** Unplaced / substitute player ids (prefer userId, else playerId) */
  benchOrder: string[];
};

export type TacticalArchetypeDef = {
  key: string;
  label: string;
  /** Underlying shape template key from TACTICAL_FORMATIONS */
  formationKey: string;
  layoutId: SportTacticalLayoutId;
  /** Short coaching-style blurb (generic, not attributed to real coaches) */
  blurb: string;
};

/** Named style overlays — constants, not DB rows (same pattern as shape presets). */
export const TACTICAL_ARCHETYPES: TacticalArchetypeDef[] = [
  {
    key: "tiki-taka-433",
    label: "Tiki-Taka 4-3-3",
    formationKey: "4-3-3",
    layoutId: "football",
    blurb: "Short passing, high possession, midfield triangles.",
  },
  {
    key: "gegenpress-4231",
    label: "Gegenpress 4-2-3-1",
    formationKey: "4-2-3-1",
    layoutId: "football",
    blurb: "Immediate counter-press after turnovers; high defensive line.",
  },
  {
    key: "park-the-bus-541",
    label: "Park the Bus 5-4-1",
    formationKey: "5-4-1",
    layoutId: "football",
    blurb: "Deep block, narrow channels, absorb pressure and counter.",
  },
  {
    key: "wing-play-442",
    label: "Wing Play 4-4-2",
    formationKey: "4-4-2",
    layoutId: "football",
    blurb: "Wide midfield supply and dual strikers.",
  },
  {
    key: "gaa-traditional-15",
    label: "Traditional 15",
    formationKey: "gaa-15",
    layoutId: "gaa",
    blurb: "Standard GAA lines from goalkeeper through full-forward.",
  },
];

/** Map sport_configs.formation_layout → tactical board layoutId. */
export function formationLayoutToLayoutId(
  formationLayout: FormationLayoutConfigValue,
): SportTacticalLayoutId | null {
  if (!formationLayout) return null;
  const v = String(formationLayout).trim().toLowerCase();
  if (v === "football-grid" || v === "football") return "football";
  if (v === "gaa-lines" || v === "gaa") return "gaa";
  return null;
}

/**
 * Resolution order (approved Task 2):
 * 1) sport_configs.formationLayout → layoutId
 * 2) fall back to layoutIdForSportFamily(team sport)
 */
export function resolveFormationLayoutId(opts: {
  teamSport: string;
  formationLayout?: FormationLayoutConfigValue;
}): SportTacticalLayoutId | null {
  const fromConfig = formationLayoutToLayoutId(opts.formationLayout ?? null);
  if (fromConfig) return fromConfig;
  const family = resolveSportFamily(opts.teamSport);
  return layoutIdForSportFamily(family);
}

export function getArchetypeDef(key: string): TacticalArchetypeDef | undefined {
  return TACTICAL_ARCHETYPES.find((a) => a.key === key);
}

export function getArchetypesForLayout(layoutId: SportTacticalLayoutId): TacticalArchetypeDef[] {
  return TACTICAL_ARCHETYPES.filter((a) => a.layoutId === layoutId);
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

/** Normalize / validate layout_json from clients (legacy rows without benchOrder ok). */
export function normalizeFormationLayoutJson(
  raw: unknown,
  fallbacks?: { formationKey?: string; layoutId?: SportTacticalLayoutId },
): FormationLayoutJson {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const layoutId = (asString(obj.layoutId) ||
    asString(obj.sport) ||
    fallbacks?.layoutId ||
    "football") as SportTacticalLayoutId;
  const formationKey =
    asString(obj.formationKey) ||
    fallbacks?.formationKey ||
    getDefaultFormationKey(layoutId);
  const archetypeKey = asString(obj.archetypeKey);

  const playersRaw = Array.isArray(obj.players) ? obj.players : [];
  const players: FormationBoardPlayer[] = playersRaw.map((p, i) => {
    const row = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
    const name = asString(row.name) || `Player ${i + 1}`;
    const note = asString(row.note);
    return {
      playerId: asString(row.playerId),
      userId: asString(row.userId),
      name,
      number: Math.round(asNumber(row.number, i + 1)),
      role: asString(row.role) || "—",
      x: clampPct(asNumber(row.x, 50)),
      y: clampPct(asNumber(row.y, 50)),
      ...(note ? { note } : {}),
    };
  });

  const benchRaw = Array.isArray(obj.benchOrder) ? obj.benchOrder : [];
  const benchOrder = benchRaw
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  return {
    formationKey,
    layoutId,
    ...(archetypeKey ? { archetypeKey } : {}),
    players,
    benchOrder,
  };
}

export function listShapePresetsForLayout(layoutId: SportTacticalLayoutId): TacticalFormationDef[] {
  return getFormationsForLayout(layoutId);
}

export function benchIdForPlayer(p: Pick<FormationBoardPlayer, "userId" | "playerId">): string | null {
  return p.userId || p.playerId || null;
}
