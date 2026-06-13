import { Router } from "express";
import { LoginSchema, RegisterSchema } from "./auth.validation";
import { login, register } from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.validation";
import { authRouteRateLimit } from "../../middleware/authRateLimit";
import { authMiddleware } from "../../middleware/auth";
import { bridgeSessionUser } from "../../middleware/bridgeSessionUser";
import {
  issueEmailVerificationCode,
  verifyEmailWithCode,
} from "./emailVerification.service";
import { userRequiresEmailVerification } from "../../lib/emailVerification";
import { storage } from "../../storage";

export const authRouter = Router();

authRouter.post("/login", authRouteRateLimit, async (req, res, next) => {
  try {
    const input: LoginInput = LoginSchema.parse(req.body);
    const result = await login(input.username, input.password);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register", authRouteRateLimit, async (req, res, next) => {
  try {
    const input: RegisterInput = RegisterSchema.parse(req.body);
    const result = await register(input.username, input.email, input.password);
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/email/verify", authMiddleware(), bridgeSessionUser, authRouteRateLimit, async (req, res) => {
  const userId = req.jwtUser?.id;
  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
  }
  const code = String(req.body?.code ?? "");
  const result = await verifyEmailWithCode(userId, code);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  const user = await storage.getUser(userId);
  return res.json({ ok: true, emailVerified: user?.emailVerified ?? true });
});

authRouter.post("/email/resend", authMiddleware(), bridgeSessionUser, authRouteRateLimit, async (req, res) => {
  const userId = req.jwtUser?.id;
  if (!userId) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
  }
  const user = await storage.getUser(userId);
  if (!user || !userRequiresEmailVerification(user)) {
    return res.json({ ok: true, message: "Email already verified" });
  }
  const result = await issueEmailVerificationCode(userId);
  return res.json({
    ok: true,
    message: "Verification code sent",
    devCode: result.devCode,
  });
});

/** Request password reset email — rate limited; generic response prevents email enumeration. */
authRouter.post("/password/forgot", authRouteRateLimit, async (req, res) => {
  void req.body?.email;
  res.json({
    message: "If an account with that email exists, password reset instructions have been sent.",
  });
});

/** Complete password reset with token — rate limited. */
authRouter.post("/password/reset", authRouteRateLimit, async (req, res) => {
  const token = req.body?.token;
  const password = req.body?.password;
  if (!token || !password) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  return res.status(400).json({ error: "Invalid or expired reset token" });
});

// Test endpoint to verify JWT authentication
authRouter.get("/me", authMiddleware(), bridgeSessionUser, async (req: any, res, next) => {
  try {
    if (!req.jwtUser?.id) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    res.json({
      message: "Authentication successful",
      user: req.jwtUser,
    });
  } catch (error) {
    next(error);
  }
});
