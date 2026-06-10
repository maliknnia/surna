import type { RequestHandler } from "express";
import { resolveRequestUserId } from "../lib/authUser";

/** After optional JWT middleware — populate req.jwtUser from cookie session when present. */
export const bridgeSessionUser: RequestHandler = (req: any, _res, next) => {
  if (!req.jwtUser?.id) {
    const id = resolveRequestUserId(req);
    if (id) req.jwtUser = { id };
  }
  next();
};
