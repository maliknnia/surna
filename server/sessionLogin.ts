import type { Express, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as client from "openid-client";
import { storage } from "./storage";
import { findUserByEmail } from "./features/auth/auth.repo";
import { authRouteRateLimit } from "./middleware/authRateLimit";
import { issueEmailVerificationCode } from "./features/auth/emailVerification.service";
import { createUser } from "./features/auth/auth.repo";
import { isProduction } from "./lib/productionSecurity";

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

type SessionUserPayload = {
  dbUser: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
    emailVerified?: boolean;
  };
  claims: {
    sub: string;
    email: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
  expires_at: number;
};

const phoneOtps = new Map<string, { code: string; expiresAt: number }>();
const phoneOtpAttempts = new Map<string, { count: number; resetAt: number }>();

function checkOtpRateLimit(key: string, max = 8, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = phoneOtpAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    phoneOtpAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function apiOrigin(req: Request): string {
  const host = req.get("host") || "localhost:5000";
  const proto = req.protocol || "http";
  return `${proto}://${host}`;
}

function loginRedirect(req: Request): string {
  const next =
    typeof req.query.next === "string" && req.query.next.startsWith("/")
      ? req.query.next
      : "/";
  return next;
}

export function establishSession(
  req: Request,
  payload: Omit<SessionUserPayload, "expires_at">,
): Promise<void> {
  return new Promise((resolve, reject) => {
    (req as any).session.localUser = {
      ...payload,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
    };
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

function authDbUnavailableMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/compute time quota|exceeded the compute/i.test(msg)) {
    return "Database is paused (Neon compute quota exceeded). Upgrade or wait for the quota reset, then try again.";
  }
  if (/ECONNREFUSED|ENOTFOUND|timeout|Connection terminated|fetch failed/i.test(msg)) {
    return "Cannot reach the database right now. Check DATABASE_URL and try again.";
  }
  return "Sign-in temporarily unavailable";
}

function phoneSignInAvailable(): boolean {
  return !isProduction() || Boolean(process.env.TWILIO_ACCOUNT_SID?.trim());
}

function nameFromEmail(email: string) {
  const local = email.split("@")[0] || "Athlete";
  const parts = local.replace(/[._+-]/g, " ").trim().split(/\s+/);
  return {
    firstName: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Athlete",
    lastName: parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "",
  };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) throw new Error("Invalid phone number");
  return digits.startsWith("0") ? digits : digits;
}

function issuePhoneCode(phone: string): string {
  const code =
    process.env.NODE_ENV === "production" && process.env.PHONE_OTP_DEV !== "1"
      ? String(Math.floor(100000 + Math.random() * 900000))
      : process.env.DEV_PHONE_OTP || "123456";
  phoneOtps.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  return code;
}

function verifyPhoneCode(phone: string, code: string): boolean {
  const entry = phoneOtps.get(phone);
  if (!entry || entry.expiresAt < Date.now()) return false;
  if (entry.code !== code.trim()) return false;
  phoneOtps.delete(phone);
  return true;
}

async function upsertEmailUser(
  email: string,
  profile?: { firstName?: string; lastName?: string },
  opts?: { emailVerified?: boolean },
) {
  const normalized = email.trim().toLowerCase();
  let user = await storage.getUserByEmail(normalized).catch(() => null);
  const names = profile?.firstName
    ? { firstName: profile.firstName, lastName: profile.lastName || "" }
    : nameFromEmail(normalized);

  if (user) {
    return user;
  }

  const id = `user-${Buffer.from(normalized).toString("hex").slice(0, 24)}`;
  return storage.createUserWithClaims(id, {
    email: normalized,
    firstName: names.firstName,
    lastName: names.lastName,
    profileImageUrl: "/avatars/me.png",
    emailVerified: opts?.emailVerified ?? false,
  });
}

async function upsertPhoneUser(phone: string) {
  const pseudoEmail = `${phone}@phone.surna.local`;
  return upsertEmailUser(pseudoEmail, { firstName: "Athlete", lastName: "" }, { emailVerified: true });
}

let googleConfigPromise: Promise<client.Configuration> | null = null;

function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function getGoogleConfig() {
  if (!googleEnabled()) throw new Error("Google sign-in is not configured");
  if (!googleConfigPromise) {
    googleConfigPromise = client.discovery(
      new URL("https://accounts.google.com"),
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    );
  }
  return googleConfigPromise;
}

export function startGoogleLogin(req: Request, res: Response) {
  void (async () => {
    try {
      const config = await getGoogleConfig();
      const redirectUri = `${apiOrigin(req)}/api/auth/google/callback`;
      const state = Buffer.from(
        JSON.stringify({ next: loginRedirect(req) }),
      ).toString("base64url");
      const url = client.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: "openid email profile",
        state,
      });
      res.redirect(url.href);
    } catch (err) {
      console.error("[auth] Google login unavailable:", err);
      res.redirect("/login?error=google_unavailable");
    }
  })();
}

export function registerSessionLoginRoutes(app: Express) {
  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      google: googleEnabled(),
      devQuickLogin:
        !isProduction() &&
        (process.env.LOCAL_AUTH_BYPASS === "1" ||
          !process.env.REPLIT_DOMAINS ||
          process.env.REPLIT_DOMAINS === "localhost"),
      phoneDevOtp: !isProduction(),
      phoneAvailable: phoneSignInAvailable(),
    });
  });

  app.post("/api/auth/sign-up/email", authRouteRateLimit, async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const baseUsername = email.split("@")[0].replace(/\W/g, "").slice(0, 20) || "athlete";
      const username = `${baseUsername}${Date.now().toString(36).slice(-4)}`;
      const passwordHash = await bcrypt.hash(password, 12);
      const firstName = String(req.body?.firstName || "").trim() || undefined;
      const lastName = String(req.body?.lastName || "").trim() || undefined;
      const dbUser = await createUser(username, email, passwordHash, { firstName, lastName });
      const verification = await issueEmailVerificationCode(dbUser.id);

      await establishSession(req, {
        dbUser: {
          id: dbUser.id,
          email: dbUser.email || email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl || "/avatars/me.png",
        },
        claims: {
          sub: dbUser.id,
          email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          profile_image_url: dbUser.profileImageUrl || "/avatars/me.png",
        },
      });

      res.status(201).json({
        ok: true,
        requiresEmailVerification: true,
        redirect: typeof req.body?.next === "string" && req.body.next.startsWith("/") ? req.body.next : "/",
        devCode: verification.devCode,
      });
    } catch (err) {
      console.error("[auth] email sign-up failed:", err);
      res.status(500).json({ message: authDbUnavailableMessage(err) });
    }
  });

  app.post("/api/auth/sign-in/email", authRouteRateLimit, async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      let dbUser: any = null;
      try {
        const row = await findUserByEmail(email);
        if (!row?.passwordHash) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return res.status(401).json({ message: "Invalid email or password" });
        dbUser = row;
      } catch (err) {
        console.error("[auth] email sign-in DB error:", err);
        return res.status(503).json({ message: authDbUnavailableMessage(err) });
      }

      await establishSession(req, {
        dbUser: {
          id: dbUser.id,
          email: dbUser.email || email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl || "/avatars/me.png",
        },
        claims: {
          sub: dbUser.id,
          email: dbUser.email || email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          profile_image_url: dbUser.profileImageUrl || "/avatars/me.png",
        },
      });

      res.json({ ok: true, redirect: typeof req.body?.next === "string" && req.body.next.startsWith("/") ? req.body.next : loginRedirect(req) });
    } catch (err) {
      console.error("[auth] email sign-in failed:", err);
      res.status(500).json({ message: "Could not sign in" });
    }
  });

  app.post("/api/auth/sign-in/phone/request", authRouteRateLimit, (req, res) => {
    try {
      if (!phoneSignInAvailable()) {
        return res.status(503).json({
          message: "Phone sign-in is not set up yet. Please use email to create an account.",
        });
      }
      const phone = normalizePhone(String(req.body?.phone || ""));
      if (!checkOtpRateLimit(`req:${phone}`)) {
        return res.status(429).json({ message: "Too many code requests. Try again later." });
      }
      const code = issuePhoneCode(phone);
      const payload: Record<string, string | boolean> = {
        ok: true,
        message: "Verification code sent",
      };
      if (!isProduction()) {
        payload.devCode = code;
      }
      res.json(payload);
    } catch {
      res.status(400).json({ message: "Enter a valid phone number" });
    }
  });

  app.post("/api/auth/sign-in/phone/verify", authRouteRateLimit, async (req, res) => {
    try {
      const phone = normalizePhone(String(req.body?.phone || ""));
      const code = String(req.body?.code || "").trim();
      if (!checkOtpRateLimit(`verify:${phone}`, 12)) {
        return res.status(429).json({ message: "Too many attempts. Try again later." });
      }
      if (!verifyPhoneCode(phone, code)) {
        return res.status(401).json({ message: "Invalid or expired code" });
      }

      let dbUser: any;
      try {
        dbUser = await upsertPhoneUser(phone);
      } catch (err) {
        console.error("[auth] phone verify DB error:", err);
        if (isProduction()) {
          return res.status(503).json({ message: authDbUnavailableMessage(err) });
        }
        dbUser = {
          id: `phone-${phone.slice(-10)}`,
          email: `${phone}@phone.surna.local`,
          firstName: "Athlete",
          lastName: "",
          profileImageUrl: "/avatars/me.png",
        };
      }

      await establishSession(req, {
        dbUser: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl || "/avatars/me.png",
        },
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          profile_image_url: dbUser.profileImageUrl || "/avatars/me.png",
        },
      });

      res.json({ ok: true, redirect: "/" });
    } catch {
      res.status(400).json({ message: "Could not verify phone number" });
    }
  });

  app.get("/api/auth/google/callback", (req, res) => {
    void (async () => {
      try {
        const config = await getGoogleConfig();
        const redirectUri = `${apiOrigin(req)}/api/auth/google/callback`;
        const currentUrl = new URL(`${apiOrigin(req)}${req.originalUrl}`);
        const tokens = await client.authorizationCodeGrant(
          config,
          currentUrl,
          {
            expectedState:
              typeof req.query.state === "string" ? req.query.state : undefined,
          },
          { redirect_uri: redirectUri },
        );
        const claims = tokens.claims();
        const email = String(claims?.email || "").toLowerCase();
        if (!email) {
          return res.redirect("/login?error=google_no_email");
        }

        const dbUser = await upsertEmailUser(email, {
          firstName: String(claims?.given_name || nameFromEmail(email).firstName),
          lastName: String(claims?.family_name || ""),
        }, { emailVerified: true }).catch(() => ({
          id: String(claims?.sub || email),
          email,
          firstName: String(claims?.given_name || "Athlete"),
          lastName: String(claims?.family_name || ""),
          profileImageUrl: String(claims?.picture || "/avatars/me.png"),
        }));

        await establishSession(req, {
          dbUser: {
            id: dbUser.id,
            email: dbUser.email || email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            profileImageUrl: dbUser.profileImageUrl || String(claims?.picture || "/avatars/me.png"),
          },
          claims: {
            sub: dbUser.id,
            email,
            first_name: dbUser.firstName ?? undefined,
            last_name: dbUser.lastName ?? undefined,
            profile_image_url: dbUser.profileImageUrl || String(claims?.picture || "/avatars/me.png"),
          },
        });

        let next = "/";
        if (typeof req.query.state === "string") {
          try {
            const parsed = JSON.parse(Buffer.from(req.query.state, "base64url").toString("utf8"));
            if (typeof parsed.next === "string" && parsed.next.startsWith("/")) next = parsed.next;
          } catch {
            /* ignore */
          }
        }
        res.redirect(next);
      } catch (err) {
        console.error("[auth] Google callback failed:", err);
        res.redirect("/login?error=google_failed");
      }
    })();
  });
}

export function devQuickLogin(req: Request, res: Response) {
  void (async () => {
    const devEmail = process.env.LOCAL_DEV_USER_EMAIL || "dev@surna.local";
    const claims = {
      sub: "local-dev-user",
      email: devEmail,
      first_name: "Local",
      last_name: "Developer",
      profile_image_url: "/avatars/me.png",
    };

    let dbUser = await storage.getUser(claims.sub).catch(() => undefined);
    if (!dbUser) {
      dbUser = await storage.getUserByEmail(devEmail).catch(() => undefined);
    }
    if (!dbUser) {
      try {
        dbUser = await storage.createUserWithClaims(claims.sub, {
          email: claims.email,
          firstName: claims.first_name,
          lastName: claims.last_name,
          profileImageUrl: claims.profile_image_url,
          emailVerified: true,
        });
      } catch (err) {
        console.warn("[devQuickLogin] Could not create dev user:", err);
        dbUser = await storage.getUserByEmail(devEmail).catch(() => undefined);
      }
    }

    const sessionId = dbUser?.id ?? claims.sub;
    await establishSession(req, {
      dbUser: {
        id: sessionId,
        email: dbUser?.email ?? claims.email,
        firstName: dbUser?.firstName ?? claims.first_name,
        lastName: dbUser?.lastName ?? claims.last_name,
        profileImageUrl: dbUser?.profileImageUrl ?? claims.profile_image_url,
        emailVerified: dbUser?.emailVerified ?? true,
      },
      claims: {
        ...claims,
        sub: sessionId,
      },
    });
    res.redirect(loginRedirect(req));
  })();
}
