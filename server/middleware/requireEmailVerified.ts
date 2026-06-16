import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authUserId, resolveRequestUserId } from "../lib/authUser";
import { userRequiresEmailVerification } from "../lib/emailVerification";
import { markEmailVerified } from "../features/auth/emailVerification.service";

console.log("[Fix 10] Email verification middleware active for post/join routes");

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
    // Local dev — allow posting without SMTP / verified inbox.
    if (process.env.LOCAL_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production") {
      return next();
    }
    // No SendGrid — verification emails can't be sent; don't block social actions.
    if (!process.env.SENDGRID_API_KEY?.trim()) {
      await markEmailVerified(userId);
      return next();
    }
    console.log("[Fix 10] Email verification required — blocked", req.method, req.path, "user", userId);
    res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Verify your email to post, join games, or message others.",
      emailVerified: false,
    });
    return;
  }

  next();
}
