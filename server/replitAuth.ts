import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import {
  devQuickLogin,
  registerSessionLoginRoutes,
  startGoogleLogin,
} from "./sessionLogin";
import { isProduction, resolveSessionSecret } from "./lib/productionSecurity";

const LOCAL_AUTH_BYPASS =
  !isProduction() &&
  (process.env.LOCAL_AUTH_BYPASS === "1" ||
    (!process.env.REPLIT_DOMAINS || process.env.REPLIT_DOMAINS === "localhost"));

const USE_REPLIT_AUTH =
  process.env.USE_REPLIT_AUTH === "1" &&
  Boolean(process.env.REPL_ID && process.env.REPLIT_DOMAINS);

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL("https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const sessionStore = LOCAL_AUTH_BYPASS
    ? undefined
    : new (connectPg(session))({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: false,
        ttl: sessionTtl,
        tableName: "sessions",
      });
  return session({
    secret: resolveSessionSecret(),
    ...(sessionStore ? { store: sessionStore } : {}),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    // Create user data without ID (will be auto-generated)
    const userData = {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    };
    
    // Check if user exists by email first
    let user = await storage.getUserByEmail(claims["email"]);
    if (user) {
      // Update existing user info
      return await storage.upsertUser({ ...userData, id: user.id });
    } else {
      // Create new user with claims sub as ID
      return await storage.createUserWithClaims(claims["sub"], userData);
    }
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  if (LOCAL_AUTH_BYPASS) {
    app.set("trust proxy", 1);
    app.use(getSession());
    registerSessionLoginRoutes(app);

    app.get("/api/login", (req, res) => {
      if (req.query.provider === "google") {
        return startGoogleLogin(req, res);
      }
      if (req.query.dev === "1" || req.query.quick === "1") {
        if (isProduction()) {
          return res.status(404).end();
        }
        return devQuickLogin(req, res);
      }
      const next =
        typeof req.query.next === "string" && req.query.next.startsWith("/")
          ? `?next=${encodeURIComponent(req.query.next)}`
          : "";
      res.redirect(`/login${next}`);
    });

    app.get("/api/logout", (req: any, res) => {
      req.session.localUser = null;
      req.session.destroy?.(() => {
        res.redirect("/");
      });
    });

    return;
  }

  app.set("trust proxy", 1);
  app.use(getSession());
  registerSessionLoginRoutes(app);

  if (!USE_REPLIT_AUTH) {
    app.get("/api/login", (req, res) => {
      if (req.query.provider === "google") {
        return startGoogleLogin(req, res);
      }
      const next =
        typeof req.query.next === "string" && req.query.next.startsWith("/")
          ? `?next=${encodeURIComponent(req.query.next)}`
          : "";
      res.redirect(`/login${next}`);
    });

    app.get("/api/logout", (req: any, res) => {
      req.session.localUser = null;
      req.session.destroy?.(() => {
        res.redirect("/");
      });
    });
    return;
  }

  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      const dbUser = await upsertUser(tokens.claims());
      // Store the database user info in session
      (user as any).dbUser = dbUser;
      verified(null, user);
    } catch (error) {
      console.error('Auth verification error:', error);
      verified(error, false);
    }
  };

  // Add strategies for all configured domains plus localhost for development
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  const allDomains = [...domains, "127.0.0.1", "localhost"];
  
  for (const domain of allDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: domain.includes("127.0.0.1") || domain.includes("localhost") 
          ? `http://${domain}:5000/api/callback`
          : `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (req.query.provider === "google") {
      return startGoogleLogin(req, res);
    }
    const nextPath =
      typeof req.query.next === "string" && req.query.next.startsWith("/")
        ? `?next=${encodeURIComponent(req.query.next)}`
        : "";
    if (req.query.provider !== "replit") {
      return res.redirect(`/login${nextPath}`);
    }
    const hostname = req.hostname === "127.0.0.1" || req.hostname === "localhost" ? "127.0.0.1" : req.hostname;
    passport.authenticate(`replitauth:${hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname === "127.0.0.1" || req.hostname === "localhost" ? "127.0.0.1" : req.hostname;
    console.log(`Auth callback for hostname: ${hostname}, query:`, req.query);
    
    passport.authenticate(`replitauth:${hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (error) => {
      if (error) {
        console.error('Authentication callback error:', error);
        return res.redirect("/api/login");
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const sessionUser = (req as any).session?.localUser;
  if (sessionUser?.dbUser) {
    const now = Math.floor(Date.now() / 1000);
    if (sessionUser.expires_at && now > sessionUser.expires_at) {
      (req as any).session.localUser = null;
      return res.status(401).json({ message: "Session expired" });
    }
    req.user = { ...sessionUser, ...sessionUser.dbUser } as any;
    return next();
  }

  if (LOCAL_AUTH_BYPASS || !USE_REPLIT_AUTH) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Ensure we have the database user info
    if (!user.dbUser && user.claims?.email) {
      try {
        user.dbUser = await storage.getUserByEmail(user.claims.email);
      } catch (error) {
        console.error('Error loading user from DB:', error);
      }
    }
    // Add user info to request object for easier access
    if (user.dbUser) {
      req.user = { ...user, ...user.dbUser };
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
