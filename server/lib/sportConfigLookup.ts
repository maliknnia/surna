import { sql } from "drizzle-orm";
import { db } from "../db";

export type SportConfigRow = {
  sportType: string;
  weightClassTracking: boolean;
  matchStructure: string;
  formationLayout: string | null;
};

/** Lookup Phase 1 sport_configs by sportType key (e.g. boxing). */
export async function getSportConfigByType(sportType: string): Promise<SportConfigRow | null> {
  const key = sportType.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases: Record<string, string> = {
    soccer: "football",
    football: "football",
    boxing: "boxing",
    gaa: "gaa",
    hurling: "gaa",
    camogie: "gaa",
    basketball: "basketball",
    volleyball: "volleyball",
  };
  const resolved = aliases[key] || key;
  try {
    const result = await db.execute(sql`
      SELECT sport_type AS "sportType",
             weight_class_tracking AS "weightClassTracking",
             match_structure AS "matchStructure",
             formation_layout AS "formationLayout"
      FROM sport_configs
      WHERE sport_type = ${resolved}
      LIMIT 1
    `);
    const row = result.rows[0] as SportConfigRow | undefined;
    return row || null;
  } catch {
    return null;
  }
}

export function sportImpliesWeightClassTracking(sport: string, config: SportConfigRow | null): boolean {
  if (config?.weightClassTracking) return true;
  const s = sport.toLowerCase();
  return s.includes("boxing") || s.includes("mma") || s.includes("combat");
}
