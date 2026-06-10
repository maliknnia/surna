import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hasPermission } from "./rbac";
import type { AdminPermission } from "@shared/schema";

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string | null;
    role: string | null;
    require2FA: boolean;
  };
}

export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const sessionUser = req.user as { id?: string; claims?: { sub?: string } };
  const userId = sessionUser.claims?.sub || sessionUser.id;
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.adminRole) {
    return res.status(403).json({ message: "Admin access required" });
  }

  // CRITICAL: Enforce 2FA requirement before granting admin access
  if (user.require2FA) {
    const session = req.session as any;
    if (!session.mfaVerified || session.mfaUserId !== user.id) {
      return res.status(403).json({ 
        message: "Two-factor authentication required",
        requireMFA: true 
      });
    }
  }

  req.admin = {
    id: user.id,
    email: user.email,
    role: user.adminRole,
    require2FA: user.require2FA || false,
  };

  next();
}

export function requirePermission(permission: AdminPermission) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!hasPermission(req.admin.role as any, permission)) {
      return res.status(403).json({ 
        message: `Permission denied: ${permission} required` 
      });
    }

    next();
  };
}

export function requireAnyPermission(permissions: AdminPermission[]) {
  return async (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const hasAny = permissions.some(perm => 
      hasPermission(req.admin!.role as any, perm)
    );

    if (!hasAny) {
      return res.status(403).json({ 
        message: `Permission denied: one of [${permissions.join(', ')}] required` 
      });
    }

    next();
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}
