// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request, Response, NextFunction } from "express";

export type Role = 
  | "user"
  | "captain"
  | "coach"
  | "shop_owner"
  | "event_organizer"
  | "finance_admin"
  | "moderator"
  | "super_admin";

export type Permission =
  | "user:read"
  | "user:write"
  | "team:read"
  | "team:manage"
  | "event:read"
  | "event:manage"
  | "shop:read"
  | "shop:manage"
  | "challenge:read"
  | "challenge:manage"
  | "payments:read"
  | "payments:payout"
  | "content:moderate"
  | "admin:*";

export const PERMISSIONS: Record<Permission, Role[]> = {
  "user:read": ["user", "captain", "coach", "shop_owner", "event_organizer", "finance_admin", "moderator", "super_admin"],
  "user:write": ["user", "captain", "coach", "shop_owner", "event_organizer", "moderator", "super_admin"],
  "team:read": ["user", "captain", "coach", "moderator", "super_admin"],
  "team:manage": ["captain", "moderator", "super_admin"],
  "event:read": ["user", "captain", "coach", "event_organizer", "moderator", "super_admin"],
  "event:manage": ["event_organizer", "moderator", "super_admin"],
  "shop:read": ["user", "captain", "coach", "shop_owner", "moderator", "super_admin"],
  "shop:manage": ["shop_owner", "moderator", "super_admin"],
  "challenge:read": ["user", "captain", "coach", "moderator", "super_admin"],
  "challenge:manage": ["captain", "moderator", "super_admin"],
  "payments:read": ["user", "shop_owner", "finance_admin", "super_admin"],
  "payments:payout": ["finance_admin", "super_admin"],
  "content:moderate": ["moderator", "super_admin"],
  "admin:*": ["super_admin"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function requirePerm(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    
    const role = user.role as Role;
    if (!hasPermission(role, permission)) {
      return res.status(403).json({ 
        error: "forbidden",
        message: `Permission denied: ${permission}`
      });
    }
    
    next();
  };
}

export function requireAnyPerm(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    
    const role = user.role as Role;
    const hasAny = permissions.some(perm => hasPermission(role, perm));
    
    if (!hasAny) {
      return res.status(403).json({ 
        error: "forbidden",
        message: "Insufficient permissions"
      });
    }
    
    next();
  };
}

// Resource-level authorization
export interface ResourceOwner {
  id: string;
  ownerId?: string;
  captainId?: string;
  organizerId?: string;
  sellerId?: string;
}

export function requireOwnership(resourceGetter: (req: Request) => Promise<ResourceOwner | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "unauthorized" });
    }
    
    try {
      const resource = await resourceGetter(req);
      if (!resource) {
        return res.status(404).json({ error: "not_found" });
      }
      
      // Check if user owns this resource
      const userId = user.sub;
      const isOwner = 
        resource.ownerId === userId ||
        resource.captainId === userId ||
        resource.organizerId === userId ||
        resource.sellerId === userId;
      
      // Admins and moderators can bypass ownership
      const role = user.role as Role;
      const canBypass = ["moderator", "super_admin"].includes(role);
      
      if (!isOwner && !canBypass) {
        return res.status(403).json({ 
          error: "forbidden",
          message: "You do not own this resource"
        });
      }
      
      next();
    } catch (err) {
      return res.status(500).json({ error: "internal_error" });
    }
  };
}
