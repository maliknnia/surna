import { apiRequest } from "@/lib/queryClient";

export type ProClubRow = {
  id: string;
  ownerId: string;
  name: string;
  location?: string | null;
  logoUrl?: string | null;
  createdAt?: string;
};

export type ProClubTeamLink = {
  id: string;
  clubId: string;
  teamId: string;
  createdAt?: string;
  teamName?: string;
  teamSport?: string;
  teamLogo?: string | null;
  teamCity?: string | null;
  teamLocation?: string | null;
  memberCount?: number;
};

export type ProAcademyProfile = {
  id: string;
  clubId: string;
  userId: string;
  ageGroup?: string | null;
  progressJson?: Record<string, unknown>;
  createdAt?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
};

export type MyTeamForClubLink = {
  id: string;
  name: string;
  sport: string;
  myRole?: string;
  city?: string | null;
};

export async function fetchMyProClubs(): Promise<ProClubRow[]> {
  const res = await apiRequest("GET", "/api/pro/clubs/mine");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createProClub(input: {
  name: string;
  location?: string;
  logoUrl?: string;
}): Promise<ProClubRow> {
  const res = await apiRequest("POST", "/api/pro/club/create", input);
  return res.json();
}

export async function fetchProClubTeams(clubId: string): Promise<ProClubTeamLink[]> {
  const res = await apiRequest("GET", `/api/pro/club/${clubId}/teams`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchProClubAcademy(clubId: string): Promise<ProAcademyProfile[]> {
  const res = await apiRequest("GET", `/api/pro/club/${clubId}/academy`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchMyTeamsForClubLink(): Promise<MyTeamForClubLink[]> {
  const res = await apiRequest("GET", "/api/teams/my-teams");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? "Team"),
    sport: String(row.sport ?? ""),
    myRole: row.myRole != null ? String(row.myRole) : undefined,
    city: (row.city as string | null | undefined) ?? null,
  }));
}

export async function addProClubTeam(clubId: string, teamId: string): Promise<ProClubTeamLink> {
  const res = await apiRequest("POST", `/api/pro/club/${clubId}/team`, { teamId });
  return res.json();
}

export async function createProAcademyProfile(input: {
  clubId: string;
  userId: string;
  ageGroup?: string;
}): Promise<ProAcademyProfile> {
  const res = await apiRequest("POST", `/api/pro/club/${input.clubId}/academy/profile`, input);
  return res.json();
}

export function academyPlayerDisplayName(profile: ProAcademyProfile): string {
  const fromDisplay = profile.displayName?.trim();
  if (fromDisplay) return fromDisplay;
  const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (profile.username) return profile.username;
  return "Academy player";
}

export function teamLinkCategory(name: string): "Senior" | "Academy" {
  if (/U1[0-8]|youth|junior|academy|minors?/i.test(name)) return "Academy";
  return "Senior";
}
