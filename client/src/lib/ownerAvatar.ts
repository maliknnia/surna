/** Brand + signed-in owner assets (local / dev). */
export const SURNA_LOGO_URL = "/brand/surna-logo.png";
export const SURNA_COVER_URL = "/brand/surna-logo.png";
export const OWNER_PROFILE_AVATAR = "/avatars/me.png";

export function withOwnerProfileAvatar<T extends { profileImageUrl?: string | null }>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  return { ...user, profileImageUrl: OWNER_PROFILE_AVATAR };
}
