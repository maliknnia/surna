import type { Team } from "@shared/schema";

type TeamMedia = Team & {
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverUrl?: string | null;
};

/** Crest / logo preferred for thumbs. */
export function teamLogoUrl(team: Team): string | null {
  const t = team as TeamMedia;
  return t.logo || t.logoUrl || null;
}

/** Wide cover / action shot for soft blur atmospheres. */
export function teamCoverUrl(team: Team): string | null {
  const t = team as TeamMedia;
  return t.cover || t.coverImageUrl || t.coverUrl || null;
}

/** Best available image for colour extract / fallbacks. */
export function teamPhotoUrl(team: Team): string | null {
  return teamLogoUrl(team) || teamCoverUrl(team);
}
