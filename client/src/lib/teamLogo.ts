import type { Team } from "@shared/schema";

export function teamLogoUrl(team: Team): string | null {
  const t = team as Team & { logoUrl?: string | null };
  return t.logo || t.logoUrl || team.cover || null;
}
