// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: Role-Based Access Control (RBAC)
import type { Request, Response, NextFunction } from 'express';

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  COACH = 'coach',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // User permissions
  CREATE_POST = 'create_post',
  EDIT_OWN_POST = 'edit_own_post',
  DELETE_OWN_POST = 'delete_own_post',
  LIKE_POST = 'like_post',
  COMMENT_POST = 'comment_post',
  
  // Team permissions
  CREATE_TEAM = 'create_team',
  JOIN_TEAM = 'join_team',
  MANAGE_OWN_TEAM = 'manage_own_team',
  
  // Event permissions
  CREATE_EVENT = 'create_event',
  JOIN_EVENT = 'join_event',
  MANAGE_OWN_EVENT = 'manage_own_event',
  
  // Messaging permissions
  SEND_MESSAGE = 'send_message',
  CREATE_GROUP_CHAT = 'create_group_chat',
  
  // Coach permissions
  OFFER_COACHING = 'offer_coaching',
  MANAGE_COACHING_PROFILE = 'manage_coaching_profile',
  
  // Marketplace permissions
  LIST_PRODUCT = 'list_product',
  PURCHASE_PRODUCT = 'purchase_product',
  
  // Moderation permissions
  MODERATE_POSTS = 'moderate_posts',
  MODERATE_COMMENTS = 'moderate_comments',
  MODERATE_USERS = 'moderate_users',
  
  // Admin permissions
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_USERS = 'manage_users',
  MANAGE_CONTENT = 'manage_content',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_USER_DATA = 'export_user_data',
  
  // Super admin permissions
  MANAGE_ADMINS = 'manage_admins',
  SYSTEM_SETTINGS = 'system_settings',
  SECURITY_SETTINGS = 'security_settings'
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [
    // Guests can only view public content
  ],
  
  [UserRole.USER]: [
    Permission.CREATE_POST,
    Permission.EDIT_OWN_POST,
    Permission.DELETE_OWN_POST,
    Permission.LIKE_POST,
    Permission.COMMENT_POST,
    Permission.CREATE_TEAM,
    Permission.JOIN_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.CREATE_EVENT,
    Permission.JOIN_EVENT,
    Permission.MANAGE_OWN_EVENT,
    Permission.SEND_MESSAGE,
    Permission.CREATE_GROUP_CHAT,
    Permission.PURCHASE_PRODUCT
  ],
  
  [UserRole.COACH]: [
    // User permissions
    Permission.CREATE_POST,
    Permission.EDIT_OWN_POST,
    Permission.DELETE_OWN_POST,
    Permission.LIKE_POST,
    Permission.COMMENT_POST,
    Permission.CREATE_TEAM,
    Permission.JOIN_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.CREATE_EVENT,
    Permission.JOIN_EVENT,
    Permission.MANAGE_OWN_EVENT,
    Permission.SEND_MESSAGE,
    Permission.CREATE_GROUP_CHAT,
    Permission.PURCHASE_PRODUCT,
    // Coach permissions
    Permission.OFFER_COACHING,
    Permission.MANAGE_COACHING_PROFILE,
    Permission.LIST_PRODUCT
  ],
  
  [UserRole.ADMIN]: [
    // User and coach permissions
    Permission.CREATE_POST,
    Permission.EDIT_OWN_POST,
    Permission.DELETE_OWN_POST,
    Permission.LIKE_POST,
    Permission.COMMENT_POST,
    Permission.CREATE_TEAM,
    Permission.JOIN_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.CREATE_EVENT,
    Permission.JOIN_EVENT,
    Permission.MANAGE_OWN_EVENT,
    Permission.SEND_MESSAGE,
    Permission.CREATE_GROUP_CHAT,
    Permission.PURCHASE_PRODUCT,
    Permission.OFFER_COACHING,
    Permission.MANAGE_COACHING_PROFILE,
    Permission.LIST_PRODUCT,
    // Admin permissions
    Permission.MODERATE_POSTS,
    Permission.MODERATE_COMMENTS,
    Permission.MODERATE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CONTENT,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_USER_DATA
  ],
  
  [UserRole.SUPER_ADMIN]: [
    // All permissions
    Permission.CREATE_POST,
    Permission.EDIT_OWN_POST,
    Permission.DELETE_OWN_POST,
    Permission.LIKE_POST,
    Permission.COMMENT_POST,
    Permission.CREATE_TEAM,
    Permission.JOIN_TEAM,
    Permission.MANAGE_OWN_TEAM,
    Permission.CREATE_EVENT,
    Permission.JOIN_EVENT,
    Permission.MANAGE_OWN_EVENT,
    Permission.SEND_MESSAGE,
    Permission.CREATE_GROUP_CHAT,
    Permission.PURCHASE_PRODUCT,
    Permission.OFFER_COACHING,
    Permission.MANAGE_COACHING_PROFILE,
    Permission.LIST_PRODUCT,
    Permission.MODERATE_POSTS,
    Permission.MODERATE_COMMENTS,
    Permission.MODERATE_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_CONTENT,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_USER_DATA,
    // Super admin permissions
    Permission.MANAGE_ADMINS,
    Permission.SYSTEM_SETTINGS,
    Permission.SECURITY_SETTINGS
  ]
};

export function getUserRole(user: any): UserRole {
  if (!user || !user.claims) {
    return UserRole.GUEST;
  }
  
  // Check user role from database or claims
  return user.role || UserRole.USER;
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

// Middleware to check permissions
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getUserRole(req.user);
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to perform this action',
        required: permission,
        userRole
      });
    }
    
    next();
  };
}

export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getUserRole(req.user);
    
    if (!hasAnyPermission(userRole, permissions)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have permission to perform this action',
        required: permissions,
        userRole
      });
    }
    
    next();
  };
}

export function requireAllPermissions(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getUserRole(req.user);
    
    if (!hasAllPermissions(userRole, permissions)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You do not have all required permissions',
        required: permissions,
        userRole
      });
    }
    
    next();
  };
}

export function requireRole(requiredRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = getUserRole(req.user);
    
    // Check if user has required role or higher
    const roleHierarchy = [UserRole.GUEST, UserRole.USER, UserRole.COACH, UserRole.ADMIN, UserRole.SUPER_ADMIN];
    const userLevel = roleHierarchy.indexOf(userRole);
    const requiredLevel = roleHierarchy.indexOf(requiredRole);
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient role',
        message: `This action requires ${requiredRole} role or higher`,
        userRole,
        requiredRole
      });
    }
    
    next();
  };
}

// Check if user owns a resource (for edit/delete operations)
export function requireOwnership(getResourceUserId: (req: Request) => string | Promise<string>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const resourceUserId = await getResourceUserId(req);
      
      if (!currentUserId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to perform this action'
        });
      }
      
      if (currentUserId !== resourceUserId) {
        // Check if user has admin permissions to override ownership
        const userRole = getUserRole(req.user);
        if (!hasPermission(userRole, Permission.MANAGE_CONTENT)) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You can only modify your own content'
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Error checking ownership:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to verify ownership'
      });
    }
  };
}

// Age verification middleware for COPPA compliance
export function requireAgeVerification(minimumAge: number = 13) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !user.dateOfBirth) {
      return res.status(403).json({
        error: 'Age verification required',
        message: 'Please verify your age to access this feature'
      });
    }
    
    const birthDate = new Date(user.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < minimumAge) {
      return res.status(403).json({
        error: 'Age restriction',
        message: `You must be at least ${minimumAge} years old to access this feature`,
        requiredAge: minimumAge,
        userAge: age
      });
    }
    
    next();
  };
}

// Parental consent required for users under 18
export function requireParentalConsent() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !user.dateOfBirth) {
      return res.status(403).json({
        error: 'Age verification required',
        message: 'Please verify your age'
      });
    }
    
    const birthDate = new Date(user.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 18 && !user.parentalConsentVerified) {
      return res.status(403).json({
        error: 'Parental consent required',
        message: 'Users under 18 require verified parental consent',
        redirectTo: '/parental-consent'
      });
    }
    
    next();
  };
}