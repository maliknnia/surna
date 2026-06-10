import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export type Action =
  | "user:read" | "user:update" | "user:delete" | "user:ban"
  | "team:read" | "team:update" | "team:delete" | "team:manage_members" | "team:manage_roles"
  | "event:read" | "event:create" | "event:update" | "event:delete" | "event:approve"
  | "post:read" | "post:create" | "post:update" | "post:delete" | "post:moderate"
  | "comment:create" | "comment:delete" | "comment:moderate"
  | "shop:read" | "shop:create" | "shop:update" | "shop:delete"
  | "product:create" | "product:update" | "product:delete"
  | "order:read" | "order:update"
  | "payment:read" | "payment:refund"
  | "message:send" | "message:delete"
  | "place:create" | "place:update" | "place:delete"
  | "challenge:create" | "challenge:update" | "challenge:delete"
  | "admin:dashboard" | "admin:users" | "admin:content" | "admin:payments" | "admin:settings"
  | "pro:read" | "pro:manage" | "pro:settings";

export type Role = "user" | "captain" | "coach" | "shop_owner" | "event_organizer" | "finance_admin" | "moderator" | "super_admin";

const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  user: new Set([
    "user:read", "user:update",
    "team:read", "event:read", "event:create",
    "post:read", "post:create", "post:update",
    "comment:create",
    "shop:read", "product:create",
    "order:read",
    "payment:read",
    "message:send",
    "place:create",
    "challenge:create",
    "pro:read",
  ]),
  captain: new Set([
    "user:read", "user:update",
    "team:read", "team:update", "team:manage_members", "team:manage_roles",
    "event:read", "event:create", "event:update",
    "post:read", "post:create", "post:update", "post:delete",
    "comment:create", "comment:delete",
    "shop:read",
    "order:read",
    "payment:read",
    "message:send", "message:delete",
    "place:create", "place:update",
    "challenge:create", "challenge:update",
    "pro:read", "pro:manage", "pro:settings",
  ]),
  coach: new Set([
    "user:read", "user:update",
    "team:read", "team:update", "team:manage_members",
    "event:read", "event:create", "event:update",
    "post:read", "post:create", "post:update",
    "comment:create",
    "shop:read",
    "order:read",
    "message:send",
    "place:create",
    "challenge:create",
    "pro:read", "pro:manage",
  ]),
  shop_owner: new Set([
    "user:read", "user:update",
    "team:read", "event:read",
    "post:read", "post:create",
    "comment:create",
    "shop:read", "shop:create", "shop:update",
    "product:create", "product:update", "product:delete",
    "order:read", "order:update",
    "payment:read",
    "message:send",
    "pro:read",
  ]),
  event_organizer: new Set([
    "user:read", "user:update",
    "team:read",
    "event:read", "event:create", "event:update", "event:delete",
    "post:read", "post:create",
    "comment:create",
    "shop:read",
    "order:read",
    "message:send",
    "place:create", "place:update",
    "pro:read",
  ]),
  finance_admin: new Set([
    "user:read",
    "team:read", "event:read", "shop:read",
    "post:read",
    "order:read", "order:update",
    "payment:read", "payment:refund",
    "admin:dashboard", "admin:payments",
    "pro:read",
  ]),
  moderator: new Set([
    "user:read", "user:ban",
    "team:read", "event:read",
    "post:read", "post:moderate", "post:delete",
    "comment:moderate", "comment:delete",
    "shop:read",
    "message:delete",
    "challenge:delete",
    "admin:dashboard", "admin:users", "admin:content",
    "pro:read",
  ]),
  super_admin: new Set([
    "user:read", "user:update", "user:delete", "user:ban",
    "team:read", "team:update", "team:delete", "team:manage_members", "team:manage_roles",
    "event:read", "event:create", "event:update", "event:delete", "event:approve",
    "post:read", "post:create", "post:update", "post:delete", "post:moderate",
    "comment:create", "comment:delete", "comment:moderate",
    "shop:read", "shop:create", "shop:update", "shop:delete",
    "product:create", "product:update", "product:delete",
    "order:read", "order:update",
    "payment:read", "payment:refund",
    "message:send", "message:delete",
    "place:create", "place:update", "place:delete",
    "challenge:create", "challenge:update", "challenge:delete",
    "admin:dashboard", "admin:users", "admin:content", "admin:payments", "admin:settings",
    "pro:read", "pro:manage", "pro:settings",
  ]),
};

export function hasPermission(role: Role, action: Action): boolean {
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

function getUserRole(req: Request): Role {
  const user = (req as any).user;
  if (!user) return "user";
  return (user.role || user.claims?.role || "user") as Role;
}

function getUserId(req: Request): string | null {
  const user = (req as any).user;
  if (!user) return null;
  return user.id || user.claims?.sub || null;
}

export function authorize(action: Action, opts?: {
  resourceOwnerFn?: (req: Request) => Promise<string | null>;
  allowSelf?: boolean;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const role = getUserRole(req);
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (hasPermission(role, action)) {
      return next();
    }

    if (opts?.allowSelf && opts.resourceOwnerFn) {
      try {
        const ownerId = await opts.resourceOwnerFn(req);
        if (ownerId && ownerId === userId) return next();
      } catch {}
    }

    return res.status(403).json({ message: "Insufficient permissions", required: action, role });
  };
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = getUserRole(req);
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Insufficient role", required: roles, current: role });
    }
    next();
  };
}

export function getPermissionMatrix() {
  const matrix: Record<string, string[]> = {};
  for (const [role, perms] of Object.entries(PERMISSION_MATRIX)) {
    matrix[role] = Array.from(perms);
  }
  return matrix;
}
