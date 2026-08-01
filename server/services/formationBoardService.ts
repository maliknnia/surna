import { eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";
import {
  getArchetypeDef,
  getArchetypesForLayout,
  listShapePresetsForLayout,
  normalizeFormationLayoutJson,
  resolveFormationLayoutId,
  type FormationLayoutJson,
} from "@shared/formationBoard";
import { getDefaultFormationKey, getFormationDef } from "@shared/sportTacticalLayouts";
import { getSportConfigByType } from "../lib/sportConfigLookup";
import { storage } from "../storage";

export async function resolveTeamFormationBoardMeta(teamId: string) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new Error("Team not found");

  const sport = team.sport || "";
  const config = await getSportConfigByType(sport);
  const layoutId = resolveFormationLayoutId({
    teamSport: sport,
    formationLayout: config?.formationLayout ?? null,
  });

  const shapePresets = layoutId ? listShapePresetsForLayout(layoutId) : [];
  const archetypes = layoutId ? getArchetypesForLayout(layoutId) : [];

  return {
    teamId,
    teamSport: sport,
    sportConfigType: config?.sportType ?? null,
    formationLayout: config?.formationLayout ?? null,
    layoutId,
    defaultFormationKey: layoutId ? getDefaultFormationKey(layoutId) : null,
    shapePresets: shapePresets.map((p) => ({
      key: p.key,
      label: p.label,
      layoutId: p.layoutId,
      slotCount: p.slots.length,
    })),
    archetypes: archetypes.map((a) => ({
      key: a.key,
      label: a.label,
      formationKey: a.formationKey,
      layoutId: a.layoutId,
      blurb: a.blurb,
    })),
  };
}

export function prepareFormationWrite(input: {
  name?: string;
  sportType?: string;
  layoutJson?: unknown;
  archetypeKey?: string;
}): { name: string; sportType: string; layoutJson: FormationLayoutJson } {
  let layout = normalizeFormationLayoutJson(input.layoutJson, {
    layoutId: input.sportType as any,
  });

  const archetypeKey = input.archetypeKey || layout.archetypeKey;
  if (archetypeKey) {
    const arch = getArchetypeDef(archetypeKey);
    if (!arch) throw new Error(`Unknown archetype: ${archetypeKey}`);
    const shape = getFormationDef(arch.formationKey);
    layout = {
      ...layout,
      archetypeKey: arch.key,
      formationKey: arch.formationKey,
      layoutId: arch.layoutId,
      // If client sent empty players, seed from shape slots (coords only; names filled later)
      players:
        layout.players.length > 0
          ? layout.players
          : shape.slots.map((s, i) => ({
              name: `Player ${i + 1}`,
              number: i + 1,
              role: s.role,
              x: s.x,
              y: s.y,
            })),
    };
  }

  // Ensure formationKey exists in catalog for that layout
  const def = listShapePresetsForLayout(layout.layoutId).find((p) => p.key === layout.formationKey);
  if (!def) {
    throw new Error(
      `Formation shape "${layout.formationKey}" is not valid for layout "${layout.layoutId}"`,
    );
  }

  const name =
    input.name?.trim() ||
    (layout.archetypeKey ? getArchetypeDef(layout.archetypeKey)?.label : null) ||
    def.label ||
    layout.formationKey;

  return {
    name,
    sportType: layout.layoutId,
    layoutJson: layout,
  };
}

export async function upsertTeamFormation(
  teamId: string,
  opts: {
    formationId?: string;
    name?: string;
    sportType?: string;
    layoutJson?: unknown;
    archetypeKey?: string;
  },
) {
  const prepared = prepareFormationWrite(opts);

  if (opts.formationId) {
    const existing = await storage.getFormationById(opts.formationId);
    if (!existing || existing.teamId !== teamId) throw new Error("Formation not found");
    return storage.updateFormation(opts.formationId, {
      name: prepared.name,
      sportType: prepared.sportType,
      layoutJson: prepared.layoutJson,
    });
  }

  return storage.createFormation({
    teamId,
    name: prepared.name,
    sportType: prepared.sportType,
    layoutJson: prepared.layoutJson,
  });
}

/**
 * Link a saved formation to a match squad and sync lineup rows from layout_json.
 * Geometry stays on pro_formations; squad players get role / starter / shirt only.
 */
export async function attachFormationToMatchSquad(opts: {
  squadId: string;
  teamId: string;
  formationId: string;
}) {
  const formation = await storage.getFormationById(opts.formationId);
  if (!formation || formation.teamId !== opts.teamId) {
    throw new Error("Formation not found for this team");
  }

  const squad = await storage.getMatchSquadById(opts.squadId);
  if (!squad || squad.teamId !== opts.teamId) {
    throw new Error("Match squad not found for this team");
  }

  const layout = normalizeFormationLayoutJson(formation.layoutJson, {
    layoutId: (formation.sportType as any) || "football",
  });

  await storage.setMatchSquadFormationId(opts.squadId, opts.formationId);
  await storage.replaceSquadPlayers(
    opts.squadId,
    [
      ...layout.players
        .filter((p) => p.userId)
        .map((p) => ({
          userId: p.userId!,
          positionKey: p.role,
          isStarter: true,
          shirtNo: p.number,
        })),
      ...layout.benchOrder.map((id) => {
        // benchOrder may be userId; skip ids already on pitch
        const onPitch = layout.players.some((p) => p.userId === id || p.playerId === id);
        return onPitch
          ? null
          : {
              userId: id,
              positionKey: "SUB",
              isStarter: false,
              shirtNo: undefined as number | undefined,
            };
      }).filter(Boolean) as Array<{
        userId: string;
        positionKey: string;
        isStarter: boolean;
        shirtNo?: number;
      }>,
    ],
  );

  const players = await storage.getSquadPlayers(opts.squadId);
  const updated = await storage.getMatchSquadById(opts.squadId);
  return { squad: updated, formation, layout, players };
}
