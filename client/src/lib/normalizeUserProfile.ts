/** Map GET /api/users/:id payload into PersonProfile / ProfileHeader shape. */
export function normalizeUserProfile(user: Record<string, unknown> | null | undefined) {
  if (!user) return null;
  const profile = (user.profile as Record<string, unknown> | undefined) ?? {};
  const firstName = String(user.firstName ?? "");
  const lastName = String(user.lastName ?? "");
  const displayName = String(user.displayName ?? "").trim();
  const fullName =
    displayName ||
    `${firstName} ${lastName}`.trim() ||
    String(user.username ?? "Athlete");

  return {
    ...user,
    ...profile,
    id: user.id,
    fullName,
    avatar: user.profileImageUrl ?? profile.avatarThumbUrl ?? profile.avatar,
    username: user.username,
    bio: user.bio ?? profile.bio,
    verified: user.verified ?? false,
    location: user.location ?? profile.location,
    primarySport: user.primarySport ?? profile.primarySport ?? profile.sport,
    sport: user.primarySport ?? profile.primarySport ?? profile.sport,
    sports: user.sports ?? profile.sports,
    position: user.position ?? profile.position,
    skillLevel: user.skillLevel ?? profile.skillLevel,
    availability: user.availability ?? profile.availability,
    lookingFor: user.lookingFor ?? profile.lookingFor,
    isFollowing: user.isFollowing ?? false,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    rating: user.rating ?? { value: 0, count: 0 },
    stats: user.stats,
    achievements: user.achievements,
  };
}
