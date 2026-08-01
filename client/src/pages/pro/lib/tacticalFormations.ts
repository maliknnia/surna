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
  photoUrl?: string;
};

export type BenchPlayer = {
  id: string;
  userId?: string;
  name: string;
  number?: number;
  position?: string;
  photoUrl?: string;
};

export function isPitchSlotFilled(p: PitchPlayer): boolean {
  return !!(p.userId || p.playerId);
}

export function playerMatchesIdentity(
  a: { playerId?: string; userId?: string; id?: string },
  b: { playerId?: string; userId?: string; id?: string },
): boolean {
  if (a.userId && b.userId && a.userId === b.userId) return true;
  if (a.playerId && b.playerId && a.playerId === b.playerId) return true;
  if (a.playerId && b.id && a.playerId === b.id) return true;
  if (a.id && b.playerId && a.id === b.playerId) return true;
  if (a.id && b.id && a.id === b.id) return true;
  return false;
}

/** Empty formation slots — players start on the bench and drag onto the pitch. */
export function buildEmptyPitch(template: FormationTemplate | TacticalFormationDef): PitchPlayer[] {
  return template.slots.map((slot, i) => ({
    slotId: `slot-${i}`,
    name: slot.role,
    number: i + 1,
    role: slot.role,
    x: slot.x,
    y: slot.y,
  }));
}

export function buildPlayersFromSquad(
  template: FormationTemplate | TacticalFormationDef,
  squad: {
    id: string;
    userId?: string;
    name: string;
    number?: number;
    position?: string;
    photoUrl?: string;
  }[],
): PitchPlayer[] {
  return template.slots.map((slot, i) => {
    const p = squad[i];
    return {
      slotId: `slot-${i}`,
      playerId: p?.id,
      userId: p?.userId,
      name: p?.name ?? slot.role,
      number: p?.number ?? i + 1,
      role: p?.position || slot.role,
      x: slot.x,
      y: slot.y,
      photoUrl: p?.photoUrl,
    };
  });
}

export function snapToFormation(
  players: PitchPlayer[],
  template: FormationTemplate | TacticalFormationDef,
): PitchPlayer[] {
  const slots = template.slots;
  return slots.map((slot, i) => {
    const prev = players[i];
    if (prev && isPitchSlotFilled(prev)) {
      return { ...prev, slotId: `slot-${i}`, x: slot.x, y: slot.y, role: slot.role };
    }
    if (prev) {
      return {
        ...prev,
        slotId: `slot-${i}`,
        name: slot.role,
        role: slot.role,
        x: slot.x,
        y: slot.y,
        number: prev.number || i + 1,
      };
    }
    return {
      slotId: `slot-${i}`,
      name: slot.role,
      number: i + 1,
      role: slot.role,
      x: slot.x,
      y: slot.y,
    };
  });
}

/** Snap free-drag coords to nearest formation slot when within threshold (% of pitch). */
export function snapCoordsToNearestSlot(
  x: number,
  y: number,
  template: FormationTemplate | TacticalFormationDef,
  threshold = 9,
): { x: number; y: number; role: string; slotIndex: number } | null {
  let best: { dist: number; slotIndex: number } | null = null;
  template.slots.forEach((slot, i) => {
    const dist = Math.hypot(slot.x - x, slot.y - y);
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { dist, slotIndex: i };
    }
  });
  if (!best) return null;
  const slot = template.slots[best.slotIndex];
  return { x: slot.x, y: slot.y, role: slot.role, slotIndex: best.slotIndex };
}

export function nearestSlotIndex(
  x: number,
  y: number,
  template: FormationTemplate | TacticalFormationDef,
): number {
  let best = 0;
  let bestDist = Infinity;
  template.slots.forEach((slot, i) => {
    const dist = Math.hypot(slot.x - x, slot.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

export function clearPitchSlot(player: PitchPlayer, templateRole?: string): PitchPlayer {
  return {
    slotId: player.slotId,
    name: templateRole || player.role,
    number: player.number,
    role: templateRole || player.role,
    x: player.x,
    y: player.y,
  };
}

export function assignBenchToSlot(slot: PitchPlayer, bench: BenchPlayer, role?: string): PitchPlayer {
  return {
    ...slot,
    playerId: bench.id,
    userId: bench.userId,
    name: bench.name,
    number: bench.number ?? slot.number,
    role: role || bench.position || slot.role,
    photoUrl: bench.photoUrl,
  };
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
