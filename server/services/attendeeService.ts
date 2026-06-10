import { db } from "../db";
import {
  users,
  eventParticipants,
  events,
  teamMembers,
  matchParticipants,
  competitiveMatches,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { UserPrivacySettingsService } from "./userPrivacySettingsService";
import { storage } from "../storage";

export type AttendeeEntityType = "event" | "instant" | "challenge" | "team" | "game";

export interface PublicAttendee {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  initials: string;
}

export interface AttendeePreviewResponse {
  attendees: PublicAttendee[];
  totalCount: number;
}

function initialsFromUser(u: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
}): string {
  const name =
    u.displayName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    u.username ||
    "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

async function filterAttendees(
  rows: Array<{ userId: string; user: typeof users.$inferSelect }>,
  limit: number,
): Promise<AttendeePreviewResponse> {
  const privacyByUser = await UserPrivacySettingsService.getAttendeePrivacyBatch(
    rows.map((r) => r.userId),
  );

  const visible = rows.filter((r) => privacyByUser.get(r.userId)?.showInAttendeeLists !== false);
  const totalCount = visible.length;

  const preview = visible.slice(0, limit).map((r) => {
    const priv = privacyByUser.get(r.userId)!;
    const name =
      r.user.displayName ||
      [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ||
      r.user.username ||
      "Player";
    return {
      id: r.userId,
      name,
      profileImageUrl: priv.showPhotoInAttendeeLists ? r.user.profileImageUrl : null,
      initials: initialsFromUser(r.user),
    };
  });

  return { attendees: preview, totalCount };
}

export class AttendeeService {
  static async getPreview(
    entityType: AttendeeEntityType,
    entityId: string,
    limit = 4,
  ): Promise<AttendeePreviewResponse> {
    const type = entityType === "game" ? "instant" : entityType;

    if (type === "event") {
      const rows = await db
        .select({ userId: eventParticipants.userId, user: users })
        .from(eventParticipants)
        .innerJoin(users, eq(eventParticipants.userId, users.id))
        .where(
          and(
            eq(eventParticipants.eventId, entityId),
            inArray(eventParticipants.status, ["confirmed", "waitlist", "pending"]),
          ),
        )
        .limit(50);
      return filterAttendees(rows, limit);
    }

    if (type === "team") {
      const rows = await db
        .select({ userId: teamMembers.userId, user: users })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(and(eq(teamMembers.teamId, entityId), eq(teamMembers.status, "active")))
        .limit(50);
      return filterAttendees(rows, limit);
    }

    if (type === "instant") {
      try {
        const members = await storage.getInstantTeamMembers(entityId);
        const userIds = members.map((m: any) => m.userId || m.id).filter(Boolean);
        if (!userIds.length) return { attendees: [], totalCount: 0 };
        const userRows = await db.select().from(users).where(inArray(users.id, userIds));
        const rows = userRows.map((user) => ({
          userId: user.id,
          user,
        }));
        return filterAttendees(rows, limit);
      } catch {
        return { attendees: [], totalCount: 0 };
      }
    }

    if (type === "challenge") {
      const rows = await db
        .select({ userId: matchParticipants.participantId, user: users })
        .from(matchParticipants)
        .innerJoin(users, eq(matchParticipants.participantId, users.id))
        .where(
          and(
            eq(matchParticipants.matchId, entityId),
            eq(matchParticipants.participantType, "user"),
            inArray(matchParticipants.status, ["accepted", "pending", "checkedIn"]),
          ),
        )
        .limit(50);
      return filterAttendees(rows, limit);
    }

    return { attendees: [], totalCount: 0 };
  }
}
