import type { AdminRole, AdminPermission } from "@shared/schema";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'user:read', 'user:ban', 'user:verify', 'user:gdpr_export', 'user:gdpr_delete',
    'content:read', 'content:remove', 'content:restore',
    'team:read', 'team:verify', 'team:remove',
    'event:approve', 'event:remove',
    'shop:read', 'shop:verify', 'shop:remove', 'order:refund',
    'payments:read', 'payouts:approve', 'refunds:approve',
    'settings:read', 'settings:write',
    'analytics:read',
  ],
  
  moderator: [
    'user:read', 'user:ban',
    'content:read', 'content:remove', 'content:restore',
    'team:read', 'team:remove',
    'event:approve', 'event:remove',
    'analytics:read',
  ],
  
  finance_admin: [
    'user:read',
    'shop:read', 'shop:verify', 'order:refund',
    'payments:read', 'payouts:approve', 'refunds:approve',
    'analytics:read',
  ],
  
  event_admin: [
    'user:read',
    'event:approve', 'event:remove',
    'analytics:read',
  ],
  
  support: [
    'user:read',
    'content:read',
    'team:read',
    'shop:read',
    'analytics:read',
  ],
};

export function hasPermission(role: AdminRole | null | undefined, permission: AdminPermission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function hasAnyPermission(role: AdminRole | null | undefined, permissions: AdminPermission[]): boolean {
  if (!role) return false;
  return permissions.some(perm => hasPermission(role, perm));
}

export function hasAllPermissions(role: AdminRole | null | undefined, permissions: AdminPermission[]): boolean {
  if (!role) return false;
  return permissions.every(perm => hasPermission(role, perm));
}

export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function isSuperAdmin(role: AdminRole | null | undefined): boolean {
  return role === 'super_admin';
}
