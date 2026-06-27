import { UserPrivacySettingsService } from "./userPrivacySettingsService";
import type { PrivacyAudience } from "@shared/userPrivacy";

function audienceAllows(audience: PrivacyAudience, isSelf: boolean, isFriend: boolean): boolean {
  if (isSelf) return true;
  if (audience === "everyone") return true;
  if (audience === "friends" && isFriend) return true;
  return false;
}

async function isFriend(userId: string, viewerId: string): Promise<boolean> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const q = await db.execute(sql`
    SELECT 1 FROM follows
    WHERE follower_id = ${viewerId} AND following_id = ${userId}
    LIMIT 1
  `);
  return q.rows.length > 0;
}

/** Whether challengerId may invite or challenge targetUserId (1v1 / direct opponent). */
export async function canUserChallenge(targetUserId: string, challengerId: string): Promise<boolean> {
  if (targetUserId === challengerId) return true;
  const privacy = await UserPrivacySettingsService.getSettings(targetUserId);
  const audience = privacy.whoCanChallenge ?? "friends";
  if (audience === "nobody") return false;
  const friend = await isFriend(targetUserId, challengerId);
  return audienceAllows(audience, false, friend);
}
