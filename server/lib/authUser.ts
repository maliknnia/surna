/** Resolve authenticated user id from session, passport, or local dev login. */
export function authUserId(req: { user?: Record<string, unknown> | null }): string | undefined {
  const u = req.user as
    | {
        id?: string;
        claims?: { sub?: string };
        dbUser?: { id?: string };
      }
    | undefined;
  if (!u) return undefined;
  return u.id ?? u.claims?.sub ?? u.dbUser?.id;
}

/** Session + JWT + passport — use for feature routers that bridge to req.jwtUser. */
export function resolveRequestUserId(req: {
  user?: Record<string, unknown> | null;
  jwtUser?: { id?: string };
  session?: { localUser?: { dbUser?: { id?: string }; claims?: { sub?: string } } };
}): string | undefined {
  if (req.jwtUser?.id) return req.jwtUser.id;
  const fromUser = authUserId(req);
  if (fromUser) return fromUser;
  const local = req.session?.localUser;
  return local?.dbUser?.id ?? local?.claims?.sub;
}
