/** Profile photo for the signed-in app owner (local / dev). */
export const OWNER_PROFILE_AVATAR = "/avatars/me.png";

export function withOwnerProfileAvatar<T extends { profileImageUrl?: string | null }>(
  user: T | null | undefined,
): T | null | undefined {
  if (!user) return user;
  if (user.profileImageUrl) return user;
  return { ...user, profileImageUrl: OWNER_PROFILE_AVATAR };
}
