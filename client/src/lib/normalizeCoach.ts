import { parseCoachProfile, type CoachProfileExtras } from "@shared/coachProfile";
import type { CoachWithProfile, CoachWithUser } from "@shared/schema";

type CoachApiRow = CoachWithUser & {
  profile?: CoachProfileExtras;
  profileJson?: unknown;
};

/** Ensure list/detail responses always expose a parsed `profile` (not only `profileJson`). */
export function normalizeCoachRow(raw: CoachApiRow): CoachWithProfile {
  const profile = raw.profile ?? parseCoachProfile(raw.profileJson, raw, raw.user);
  return { ...raw, profile };
}

export function normalizeCoachList(rows: CoachApiRow[]): CoachWithProfile[] {
  return rows.map(normalizeCoachRow);
}
