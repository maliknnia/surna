import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import { userRequiresEmailVerification } from "../lib/emailVerification";

export async function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId =
    resolveRequestUserId(req as Parameters<typeof resolveRequestUserId>[0]) ??
    authUserId(req as Parameters<typeof authUserId>[0]);
  if (!userId) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
    return;
  }

  const user = await storage.getUser(userId);
  if (!user) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
    return;
  }

  if (userRequiresEmailVerification(user)) {
    res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Verify your email to post, join games, or message others.",
      emailVerified: false,
    });
    return;
  }

  next();
}
