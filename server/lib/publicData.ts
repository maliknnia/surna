/** Strip PII from records returned on public discovery APIs. */

type AnyUser = Record<string, unknown> | null | undefined;

export function toPublicUser(user: AnyUser) {
  if (!user || typeof user !== "object") return user;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    sport: user.sport,
    username: user.username,
  };
}

export function toPublicCoachRow<T extends { user?: AnyUser; profile?: Record<string, unknown> | null }>(row: T): T {
  const profile = row.profile;
  const safeProfile =
    profile && typeof profile === "object"
      ? {
          ...profile,
          contactPhone: undefined,
          verification: profile.verification
            ? {
                ...(profile.verification as Record<string, unknown>),
                phone: undefined,
                paymentMethod: undefined,
                idDocumentProvided: undefined,
                certificationDocsProvided: undefined,
                notes: undefined,
              }
            : undefined,
        }
      : profile;

  if (!row?.user) {
    return { ...row, profile: safeProfile as T["profile"] };
  }
  return {
    ...row,
    profile: safeProfile as T["profile"],
    user: toPublicUser(row.user) as T["user"],
  };
}
