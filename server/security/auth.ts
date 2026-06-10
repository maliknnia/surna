// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";

const ACCESS_TTL = "10m"; // 10 minutes
const REFRESH_TTL_SEC = 60 * 60 * 24 * 14; // 14 days

// Generate secure fallback secrets if not provided
let accessSecret: string;
let refreshSecret: string;

export function initializeAuthSecrets() {
  if (process.env.JWT_ACCESS_SECRET) {
    accessSecret = process.env.JWT_ACCESS_SECRET;
  } else {
    console.warn("⚠️  JWT_ACCESS_SECRET not set. Generating temporary key (session tokens will be invalidated on restart)");
    accessSecret = randomBytes(32).toString("hex");
  }
  
  if (process.env.JWT_REFRESH_SECRET) {
    refreshSecret = process.env.JWT_REFRESH_SECRET;
  } else {
    console.warn("⚠️  JWT_REFRESH_SECRET not set. Generating temporary key (session tokens will be invalidated on restart)");
    refreshSecret = randomBytes(32).toString("hex");
  }
}

// Redis-backed refresh token store with fallback to in-memory
let redisClient: any = null;
const inMemoryStore = new Map<string, { userId: string; exp: number }>();

export async function initializeRedisStore() {
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = await import("redis");
      redisClient = createClient({ url: process.env.REDIS_URL, socket: { connectTimeoutMs: 5000, reconnectStrategy: (retries) => retries > 1 ? false as any : 1000 } });
      redisClient.on('error', () => {});
      await redisClient.connect();
      console.log("✅ Redis connected for refresh token storage");
    } catch (err) {
      console.warn("⚠️  Redis connection failed, using in-memory fallback:", (err as Error).message);
      redisClient = null;
    }
  } else {
    console.warn("⚠️  REDIS_URL not set. Using in-memory token storage (tokens lost on restart)");
  }
}

async function setRefreshToken(jti: string, userId: string, exp: number): Promise<void> {
  if (redisClient) {
    await redisClient.setEx(`rt:${jti}`, REFRESH_TTL_SEC, JSON.stringify({ userId, exp }));
  } else {
    inMemoryStore.set(jti, { userId, exp });
  }
}

async function getRefreshToken(jti: string): Promise<{ userId: string; exp: number } | null> {
  if (redisClient) {
    const data = await redisClient.get(`rt:${jti}`);
    return data ? JSON.parse(data) : null;
  } else {
    return inMemoryStore.get(jti) || null;
  }
}

async function deleteRefreshToken(jti: string): Promise<void> {
  if (redisClient) {
    await redisClient.del(`rt:${jti}`);
  } else {
    inMemoryStore.delete(jti);
  }
}

export interface TokenPayload {
  sub: string;
  role: string;
  jti?: string;
}

export function signAccess(user: { id: string; role: string }): string {
  if (!accessSecret) {
    throw new Error("Auth secrets not initialized. Call initializeAuthSecrets() first.");
  }
  return jwt.sign(
    { sub: user.id, role: user.role },
    accessSecret,
    { expiresIn: ACCESS_TTL }
  );
}

export async function signRefresh(userId: string): Promise<string> {
  if (!refreshSecret) {
    throw new Error("Auth secrets not initialized. Call initializeAuthSecrets() first.");
  }
  const jti = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + REFRESH_TTL_SEC;
  
  const token = jwt.sign(
    { sub: userId, jti },
    refreshSecret,
    { expiresIn: REFRESH_TTL_SEC }
  );
  
  // Store jti in Redis or in-memory fallback
  await setRefreshToken(jti, userId, exp);
  
  return token;
}

export async function rotateRefresh(oldJti: string, userId: string): Promise<string> {
  // Revoke old token
  await deleteRefreshToken(oldJti);
  // Issue new token
  return signRefresh(userId);
}

export async function isRefreshValid(jti: string): Promise<boolean> {
  const entry = await getRefreshToken(jti);
  if (!entry) return false;
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (entry.exp < now) {
    await deleteRefreshToken(jti);
    return false;
  }
  
  return true;
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await deleteRefreshToken(jti);
}

// Cleanup expired tokens periodically (in-memory only)
setInterval(() => {
  if (!redisClient) {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, entry] of inMemoryStore.entries()) {
      if (entry.exp < now) {
        inMemoryStore.delete(jti);
      }
    }
  }
}, 60 * 60 * 1000); // Every hour

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "No token provided" });
  }
  
  try {
    if (!accessSecret) {
      throw new Error("Auth secrets not initialized");
    }
    const payload = jwt.verify(token, accessSecret) as TokenPayload;
    (req as any).user = payload;
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(419).json({ error: "token_expired", message: "Please refresh your session" });
    }
    return res.status(401).json({ error: "unauthorized", message: "Invalid token" });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  
  if (!token) {
    return next();
  }
  
  try {
    if (!accessSecret) {
      return next();
    }
    const payload = jwt.verify(token, accessSecret) as TokenPayload;
    (req as any).user = payload;
  } catch {
    // Ignore errors for optional auth
  }
  
  return next();
}

// Re-authentication check for sensitive operations
export function requireReauth(maxAge: number = 5 * 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    
    // Check if user has recent authentication timestamp
    const lastAuth = (req.session as any)?.lastAuthTime;
    if (!lastAuth || Date.now() - lastAuth > maxAge * 1000) {
      return res.status(403).json({ 
        error: "reauth_required",
        message: "Please re-authenticate for this sensitive operation"
      });
    }
    
    next();
  };
}

// Mark session as recently authenticated
export function markRecentAuth(req: Request) {
  if (req.session) {
    (req.session as any).lastAuthTime = Date.now();
  }
}
