/** Brand + signed-in owner assets (local / dev). */
export const SURNA_LOGO_URL = "/brand/surna-logo.png";
/** Owner profile banner / app cover photo */
export const OWNER_COVER_URL = "/avatars/me.png";
export const OWNER_PROFILE_AVATAR = "/avatars/me.png";

export function withOwnerProfileAvatar<T extends { profileImageUrl?: string | null }>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  return { ...user, profileImageUrl: OWNER_PROFILE_AVATAR };
}
