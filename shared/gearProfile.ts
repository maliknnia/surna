import { z } from "zod";

export type GearProfileVisibility = "private" | "team_managers" | "team" | "public";

export type GearProfile = {
  heightCm?: number;
  weightKg?: number;
  shirtSize?: string;
  shortsSize?: string;
  shoeSizeEu?: string;
  shoeSizeUk?: string;
  preferredJerseyNumber?: number;
  dominantSide?: "left" | "right" | "ambidextrous";
  kitNotes?: string;
  visibility?: GearProfileVisibility;
  updatedAt?: string;
};

export const SHIRT_SIZES = [
  "YXS",
  "YS",
  "YM",
  "YL",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
] as const;

export const SHOE_SIZES_EU = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
] as const;

export const GEAR_VISIBILITY_LABELS: Record<GearProfileVisibility, string> = {
  private: "Only me",
  team_managers: "Team captains (recommended)",
  team: "All teammates",
  public: "Public on profile",
};

export const gearProfileSchema = z.object({
  heightCm: z.number().int().min(100).max(250).optional(),
  weightKg: z.number().min(30).max(200).optional(),
  shirtSize: z.string().max(10).optional(),
  shortsSize: z.string().max(10).optional(),
  shoeSizeEu: z.string().max(10).optional(),
  shoeSizeUk: z.string().max(10).optional(),
  preferredJerseyNumber: z.number().int().min(0).max(99).optional(),
  dominantSide: z.enum(["left", "right", "ambidextrous"]).optional(),
  kitNotes: z.string().max(500).optional(),
  visibility: z.enum(["private", "team_managers", "team", "public"]).optional(),
});

export const DEFAULT_GEAR_PROFILE: GearProfile = {
  visibility: "team_managers",
};

export function parseGearProfile(raw: unknown): GearProfile {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GEAR_PROFILE };
  const parsed = gearProfileSchema.safeParse(raw);
  if (!parsed.success) return { ...DEFAULT_GEAR_PROFILE };
  return { ...DEFAULT_GEAR_PROFILE, ...parsed.data };
}

export function mergeGearProfile(current: GearProfile | undefined, patch: GearProfile): GearProfile {
  return {
    ...DEFAULT_GEAR_PROFILE,
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

/** Minimum fields needed for team kit / merch orders */
export function isGearProfileReadyForKit(gear?: GearProfile | null): boolean {
  if (!gear) return false;
  return !!(gear.shirtSize?.trim() && gear.shoeSizeEu?.trim());
}

export function gearProfileMissingFields(gear?: GearProfile | null): string[] {
  const missing: string[] = [];
  if (!gear?.shirtSize?.trim()) missing.push("shirt size");
  if (!gear?.shoeSizeEu?.trim()) missing.push("shoe size");
  if (!gear?.heightCm) missing.push("height");
  return missing;
}

export function formatHeightCm(cm?: number | null): string {
  if (!cm || cm <= 0) return "—";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inches = totalIn % 12;
  return `${cm} cm (${ft}'${inches}")`;
}

export function canViewerSeeGearProfile(params: {
  gear?: GearProfile | null;
  viewerUserId: string;
  subjectUserId: string;
  viewerIsTeamManager: boolean;
  viewerIsTeammate: boolean;
}): boolean {
  const { gear, viewerUserId, subjectUserId, viewerIsTeamManager, viewerIsTeammate } = params;
  if (viewerUserId === subjectUserId) return true;
  if (!gear) return false;
  const visibility = gear.visibility ?? "team_managers";
  if (visibility === "public") return true;
  if (visibility === "team" && viewerIsTeammate) return true;
  if (visibility === "team_managers" && viewerIsTeamManager) return true;
  return false;
}

export type GearProfileSummary = {
  heightCm?: number;
  shirtSize?: string;
  shortsSize?: string;
  shoeSizeEu?: string;
  preferredJerseyNumber?: number;
  kitNotes?: string;
};

export function gearProfileSummary(gear?: GearProfile | null): GearProfileSummary | null {
  if (!gear) return null;
  return {
    heightCm: gear.heightCm,
    shirtSize: gear.shirtSize,
    shortsSize: gear.shortsSize,
    shoeSizeEu: gear.shoeSizeEu,
    preferredJerseyNumber: gear.preferredJerseyNumber,
    kitNotes: gear.kitNotes,
  };
}
