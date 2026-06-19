/** Brand + signed-in owner assets (local / dev). */
export const SURNA_LOGO_URL = "/brand/surna-logo.png";
/** Transparent runner mark for light UI backgrounds. */
export const SURNA_LOGO_MARK_URL = "/brand/surna-logo-mark.png";
/** Transparent runner mark for dark UI backgrounds. */
export const SURNA_LOGO_MARK_LIGHT_URL = "/brand/surna-logo-mark-light.png";
/** Profile banner + app/social cover — runner logo mark */
export const OWNER_COVER_URL = SURNA_LOGO_URL;
/** Owner profile photo (separate from logo cover) */
export const OWNER_PROFILE_AVATAR = "/avatars/me.png";

export function withOwnerProfileAvatar<T extends { profileImageUrl?: string | null }>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  return { ...user, profileImageUrl: OWNER_PROFILE_AVATAR };
}
