import { UserPrivacySettingsService } from "./userPrivacySettingsService";
import type { PrivacyAudience } from "@shared/userPrivacy";

export type HealthSection = "weeklyLoad" | "monthlyTrend" | "streak" | "personalBests";

const SECTION_KEY: Record<HealthSection, keyof import("@shared/userPrivacy").UserPrivacySettings> = {
  weeklyLoad: "healthWeeklyLoadVisibility",
  monthlyTrend: "healthMonthlyTrendVisibility",
  streak: "healthStreakVisibility",
  personalBests: "healthPersonalBestsVisibility",
};

function audienceAllows(audience: PrivacyAudience, isSelf: boolean, isFriend: boolean): boolean {
  if (isSelf) return true;
  if (audience === "everyone") return true;
  if (audience === "friends" && isFriend) return true;
  return false;
}

async function isFriend(userId: string, viewerId: string | null | undefined): Promise<boolean> {
  if (!viewerId) return false;
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const q = await db.execute(sql`
    SELECT 1 FROM follows
    WHERE follower_id = ${viewerId} AND following_id = ${userId}
    LIMIT 1
  `);
  return q.rows.length > 0;
}

export async function canViewHealthSection(
  profileUserId: string,
  viewerId: string | null | undefined,
  section: HealthSection,
): Promise<boolean> {
  const privacy = await UserPrivacySettingsService.getSettings(profileUserId);
  const key = SECTION_KEY[section];
  const audience = (privacy[key] as PrivacyAudience | undefined) ?? privacy.statsVisibility ?? "friends";
  const isSelf = viewerId === profileUserId;
  if (isSelf) return true;
  const friend = await isFriend(profileUserId, viewerId);
  return audienceAllows(audience, isSelf, friend);
}
