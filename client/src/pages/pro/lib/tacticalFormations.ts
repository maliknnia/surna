/** Normalized pitch coordinates: x/y are 0–100 (left→right, top→opponent goal). */

import {
  TACTICAL_FORMATIONS,
  getDefaultFormationKey,
  getFormationDef,
  getFormationsForLayout,
  getLayoutMeta,
  type SlotTemplate,
  type SportTacticalLayoutId,
  type TacticalFormationDef,
} from "@shared/sportTacticalLayouts";

export type { SlotTemplate, SportTacticalLayoutId, TacticalFormationDef };
export { getDefaultFormationKey, getFormationsForLayout, getLayoutMeta };

/** @deprecated Prefer string formation keys from getFormationsForLayout */
export type FormationKey = string;

export type FormationTemplate = TacticalFormationDef & { sport?: SportTacticalLayoutId };

export const FORMATION_TEMPLATES = TACTICAL_FORMATIONS;

export function getFormationTemplate(key: string): FormationTemplate {
  const def = getFormationDef(key);
  return { ...def, sport: def.layoutId };
}

export function footballFormationKeys(): string[] {
  return getFormationsForLayout("football").map((f) => f.key);
}

export type PitchPlayer = {
  slotId: string;
  playerId?: string;
  userId?: string;
  name: string;
  number: number;
  role: string;
  x: number;
  y: number;
};

export function buildPlayersFromSquad(
  template: FormationTemplate | TacticalFormationDef,
  squad: { id: string; userId?: string; name: string; number?: number; position?: string }[],
): PitchPlayer[] {
  return template.slots.map((slot, i) => {
    const p = squad[i];
    return {
      slotId: `slot-${i}`,
      playerId: p?.id,
      userId: p?.userId,
      name: p?.name ?? `Player ${i + 1}`,
      number: p?.number ?? i + 1,
      role: p?.position || slot.role,
      x: slot.x,
      y: slot.y,
    };
  });
}

export function snapToFormation(
  players: PitchPlayer[],
  template: FormationTemplate | TacticalFormationDef,
): PitchPlayer[] {
  return players.map((p, i) => {
    const slot = template.slots[i];
    if (!slot) return p;
    return { ...p, x: slot.x, y: slot.y, role: slot.role };
  });
}

export type FormationMessagePayload = {
  surnaType: "formation";
  formationName: string;
  /** Legacy football/gaa — prefer layoutId */
  sport?: SportTacticalLayoutId | "football" | "gaa";
  layoutId?: SportTacticalLayoutId;
  players: {
    name: string;
    number: number;
    role: string;
    x: number;
    y: number;
    userId?: string;
  }[];
  notesByUserId?: Record<string, string>;
};

export function encodeFormationMessage(payload: FormationMessagePayload): string {
  return `__SURNA_FORMATION__${JSON.stringify(payload)}`;
}

export function parseFormationMessage(body: string | null | undefined): FormationMessagePayload | null {
  if (!body || !body.startsWith("__SURNA_FORMATION__")) return null;
  try {
    return JSON.parse(body.slice("__SURNA_FORMATION__".length)) as FormationMessagePayload;
  } catch {
    return null;
  }
}

export function resolvePayloadLayout(payload: FormationMessagePayload): SportTacticalLayoutId {
  if (payload.layoutId) return payload.layoutId;
  if (payload.sport === "gaa") return "gaa";
  if (payload.sport === "football") return "football";
  return "football";
}
