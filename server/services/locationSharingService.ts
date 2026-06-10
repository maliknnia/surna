import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { userFollows, userLocationCircles, teamMembers } from "@shared/schema";
import type { PresenceVisibility } from "@shared/locationSharing";

const FAMILY_CIRCLE = "family";

export class LocationSharingService {
  static async getFamilyMemberIds(ownerId: string): Promise<Set<string>> {
    try {
      const rows = await db
        .select({ memberId: userLocationCircles.memberId })
        .from(userLocationCircles)
        .where(
          and(
            eq(userLocationCircles.userId, ownerId),
            eq(userLocationCircles.circle, FAMILY_CIRCLE),
          ),
        );
      return new Set(rows.map((r) => r.memberId));
    } catch {
      return new Set();
    }
  }

  static async listFamilyMembers(ownerId: string) {
    const rows = await db
      .select({
        memberId: userLocationCircles.memberId,
        createdAt: userLocationCircles.createdAt,
      })
      .from(userLocationCircles)
      .where(
        and(
          eq(userLocationCircles.userId, ownerId),
          eq(userLocationCircles.circle, FAMILY_CIRCLE),
        ),
      );
    return rows;
  }

  static async addFamilyMember(ownerId: string, memberId: string) {
    if (ownerId === memberId) {
      throw new Error("Cannot add yourself to family");
    }
    await db
      .insert(userLocationCircles)
      .values({ userId: ownerId, memberId, circle: FAMILY_CIRCLE })
      .onConflictDoNothing();
  }

  static async removeFamilyMember(ownerId: string, memberId: string) {
    await db
      .delete(userLocationCircles)
      .where(
        and(
          eq(userLocationCircles.userId, ownerId),
          eq(userLocationCircles.memberId, memberId),
          eq(userLocationCircles.circle, FAMILY_CIRCLE),
        ),
      );
  }

  static async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userFollows.id })
      .from(userFollows)
      .where(
        and(
          eq(userFollows.followerId, followerId),
          eq(userFollows.followedId, followedId),
        ),
      )
      .limit(1);
    return !!row;
  }

  static async areMutualFriends(userId1: string, userId2: string): Promise<boolean> {
    const [a, b] = await Promise.all([
      this.isFollowing(userId1, userId2),
      this.isFollowing(userId2, userId1),
    ]);
    return a && b;
  }

  /** True when both users belong to at least one shared active team. */
  static async shareSameTeam(userId1: string, userId2: string): Promise<boolean> {
    try {
      const rows = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, userId1), eq(teamMembers.status, "active")));
      const teamIds = rows.map((r) => r.teamId);
      if (!teamIds.length) return false;
      const [shared] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, userId2),
            eq(teamMembers.status, "active"),
            inArray(teamMembers.teamId, teamIds),
          ),
        )
        .limit(1);
      return !!shared;
    } catch {
      return false;
    }
  }

  /** Whether `viewerId` may see `ownerId`'s live map pin. */
  static async canViewPresence(
    viewerId: string | null,
    ownerId: string,
    visibility: PresenceVisibility | string | null | undefined,
  ): Promise<boolean> {
    const v = (visibility || "ghost") as PresenceVisibility;
    if (v === "ghost") return false;
    if (!viewerId) return v === "public";
    if (viewerId === ownerId) return false;

    switch (v) {
      case "public":
        return true;
      case "followers":
        return this.isFollowing(viewerId, ownerId);
      case "friends":
        return this.areMutualFriends(viewerId, ownerId);
      case "family": {
        const family = await this.getFamilyMemberIds(ownerId);
        return family.has(viewerId);
      }
      case "team_only":
        return this.shareSameTeam(viewerId, ownerId);
      default:
        return false;
    }
  }

  /** Viewer-specific filter for cached map markers. */
  static async filterMapItemsForViewer<T extends { type: string; id: string; meta?: Record<string, unknown> }>(
    viewerId: string | null,
    items: T[],
  ): Promise<T[]> {
    const out: T[] = [];
    for (const item of items) {
      if (item.type !== "person") {
        out.push(item);
        continue;
      }
      const visibility = item.meta?.presenceVisibility as string | undefined;
      const ok = await this.canViewPresence(viewerId, item.id, visibility);
      if (ok) out.push(item);
    }
    return out;
  }
}
