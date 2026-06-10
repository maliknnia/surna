/** Resolve the signed-in user for Pro routes (Passport + local dev bypass). */

function userIdFromRecord(u: Record<string, unknown> | null | undefined): string | null {
  if (!u) return null;
  const claims = u.claims as { sub?: string } | undefined;
  const dbUser = u.dbUser as { id?: string } | undefined;
  return claims?.sub || (u.id as string) || dbUser?.id || null;
}

function mergedLocalSessionUser(localUser: { dbUser: Record<string, unknown>; claims?: { sub?: string } }) {
  return { ...localUser, ...localUser.dbUser, claims: localUser.claims };
}

/** Populate req.user from session when local bypass is active (Pro routes skip isAuthenticated). */
export function attachProSessionUser(req: any, _res: any, next: () => void) {
  const localUser = req.session?.localUser;
  if (localUser?.dbUser) {
    req.user = mergedLocalSessionUser(localUser);
  }
  next();
}

export function getProSessionUser(req: any): Record<string, unknown> | null {
  const localUser = req.session?.localUser;
  if (localUser?.dbUser) {
    return mergedLocalSessionUser(localUser);
  }
  if (req.user) {
    return req.user as Record<string, unknown>;
  }
  if (req.isAuthenticated?.() && req.user) {
    return req.user as Record<string, unknown>;
  }
  return null;
}

/** Resolve user id for Pro handlers — session-first, then req.user. */
export function resolveProUserId(req: any): string | null {
  const localUser = req.session?.localUser;
  if (localUser?.dbUser) {
    return localUser.claims?.sub || (localUser.dbUser.id as string) || null;
  }
  return userIdFromRecord(req.user as Record<string, unknown> | undefined);
}

export function getProSessionUserId(req: any): string | null {
  return userIdFromRecord(getProSessionUser(req));
}
