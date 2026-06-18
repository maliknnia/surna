import { getDemoEvent, isDemoEventId } from "@/lib/demoEvents";
import { getDemoTeamMembers, isDemoTeamId, normalizeDemoTeamId } from "@/lib/demoTeams";
import { pickStoryUsers } from "@/lib/personalizedDemoFeed";

export type ActivityPerson = {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  role?: string;
  sport?: string;
};

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** How many faces to show on cards — real count when known, otherwise 1–4 for demo */
export function previewAttendeeCount(entityId: string, knownCount?: number): number {
  if (knownCount != null && knownCount > 0) return knownCount;
  return 1 + (hashSeed(entityId) % 4);
}

export function demoPeopleForEntity(entityId: string, knownCount?: number): ActivityPerson[] {
  const count = previewAttendeeCount(entityId, knownCount);
  if (count <= 0) return [];
  return pickStoryUsers(hashSeed(entityId), count).map((u) => ({
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
    username: u.username,
    avatarUrl: u.profileImageUrl,
    isPrivate: false,
    sport: u.sport,
  }));
}

export function isPrivateProfile(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return false;
  const vis =
    (user.profileVisibility as string | undefined) ??
    (user.privacy as { profileVisibility?: string } | undefined)?.profileVisibility;
  return vis === "private";
}

export function mapTeamMembers(members: unknown[]): ActivityPerson[] {
  if (!Array.isArray(members)) return [];
  return members.map((row) => {
    const m = row as Record<string, unknown>;
    const user = (m.user as Record<string, unknown>) || m;
    const first = String(user.firstName || "");
    const last = String(user.lastName || "");
    const name =
      String(user.displayName || "").trim() ||
      [first, last].filter(Boolean).join(" ") ||
      String(user.username || "Member");
    return {
      id: String(user.id || m.userId || m.id),
      name,
      username: user.username ? String(user.username) : undefined,
      avatarUrl: user.profileImageUrl ? String(user.profileImageUrl) : undefined,
      isPrivate: isPrivateProfile(user),
      role: m.role ? String(m.role) : undefined,
      sport: user.sport ? String(user.sport) : undefined,
    };
  });
}

export function mapEventParticipants(participants: unknown[]): ActivityPerson[] {
  if (!Array.isArray(participants)) return [];
  return participants
    .filter((row) => {
      const p = row as Record<string, unknown>;
      const part = (p.participant as Record<string, unknown>) || p;
      const status = String(part.status || part.rsvpStatus || "going").toLowerCase();
      return status !== "not_going" && status !== "declined" && status !== "cancelled";
    })
    .map((row) => {
      const p = row as Record<string, unknown>;
      const part = (p.participant as Record<string, unknown>) || p;
      const user = (p.user as Record<string, unknown>) || part;
      const first = String(user.firstName || "");
      const last = String(user.lastName || "");
      const name =
        String(user.displayName || "").trim() ||
        [first, last].filter(Boolean).join(" ") ||
        String(user.username || "Guest");
      return {
        id: String(user.id || part.userId),
        name,
        username: user.username ? String(user.username) : undefined,
        avatarUrl: user.profileImageUrl ? String(user.profileImageUrl) : undefined,
        isPrivate: isPrivateProfile(user),
        role: String(part.status || "going"),
        sport: user.sport ? String(user.sport) : undefined,
      };
    });
}

export async function fetchTeamPeople(teamId: string): Promise<ActivityPerson[]> {
  const normalizedId = normalizeDemoTeamId(teamId);
  if (isDemoTeamId(normalizedId)) {
    return mapTeamMembers(getDemoTeamMembers(normalizedId));
  }
  const endpoints = [`/api/teams/${normalizedId}/details`, `/api/teams/${normalizedId}`];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) continue;
      const data = await res.json();
      const mapped = mapTeamMembers(data.members || []);
      if (mapped.length > 0) return mapped;
    } catch {
      /* try next */
    }
  }
  return demoPeopleForEntity(teamId);
}

export async function fetchEventPeople(eventId: string): Promise<ActivityPerson[]> {
  if (isDemoEventId(eventId)) {
    const ev = getDemoEvent(eventId);
    const count = ev?.going_count ?? previewAttendeeCount(eventId);
    return demoPeopleForEntity(eventId, count);
  }
  try {
    const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      const mapped = mapEventParticipants(data.participants || []);
      if (mapped.length > 0) return mapped;
    }
  } catch {
    /* fallback */
  }
  return demoPeopleForEntity(eventId);
}
