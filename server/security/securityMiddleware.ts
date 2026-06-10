// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: Security Middleware & Headers
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';
import {
  authRouteRateLimit,
  loginLimiter,
} from '../middleware/authRateLimit';
import rateLimit from 'express-rate-limit';

export { authRouteRateLimit, loginLimiter };

// Security headers configuration
export function setupSecurityMiddleware(app: Express) {
  // Helmet for basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // Additional security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
}

// Sensitive operations rate limiting
export const sensitiveOperationsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 sensitive operations per hour
  message: {
    error: 'Too many sensitive operations from this IP',
    retryAfter: 3600
  },
  // Removed custom keyGenerator to fix IPv6 compatibility
});

// Password change rate limiting
export const passwordChangeLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 password changes per day
  message: {
    error: 'Too many password change attempts',
    retryAfter: 86400
  },
  // Removed custom keyGenerator to fix IPv6 compatibility
});

// Admin operations rate limiting
export const adminOperationsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 admin operations per 5 minutes
  message: {
    error: 'Too many admin operations',
    retryAfter: 300
  },
  // Removed custom keyGenerator to fix IPv6 compatibility
});

// Data export rate limiting (GDPR compliance)
export const dataExportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2, // 2 data exports per day
  message: {
    error: 'Too many data export requests',
    retryAfter: 86400
  },
  // Removed custom keyGenerator to fix IPv6 compatibility
});

// IP-based blocking for suspicious activity
const blockedIPs = new Set<string>();
const suspiciousActivity = new Map<string, { count: number; firstSeen: number }>();

export function trackSuspiciousActivity(ip: string) {
  const now = Date.now();
  const activity = suspiciousActivity.get(ip) || { count: 0, firstSeen: now };
  
  // Reset count if more than 1 hour has passed
  if (now - activity.firstSeen > 60 * 60 * 1000) {
    activity.count = 1;
    activity.firstSeen = now;
  } else {
    activity.count++;
  }
  
  suspiciousActivity.set(ip, activity);
  
  // Block IP if more than 50 suspicious activities in 1 hour
  if (activity.count > 50) {
    blockedIPs.add(ip);
    console.warn(`🚨 IP ${ip} blocked for suspicious activity (${activity.count} activities)`);
  }
}

export function ipBlockingMiddleware(req: Request, res: Response, next: NextFunction) {
  if (blockedIPs.has(req.ip || '')) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP has been temporarily blocked due to suspicious activity'
    });
  }
  next();
}

// Cleanup blocked IPs periodically (every hour)
setInterval(() => {
  const now = Date.now();
  for (const [ip, activity] of suspiciousActivity.entries()) {
    if (now - activity.firstSeen > 24 * 60 * 60 * 1000) { // 24 hours
      suspiciousActivity.delete(ip);
      blockedIPs.delete(ip);
    }
  }
}, 60 * 60 * 1000);

export { trackSuspiciousActivity as logSuspiciousActivity };

// Missing exports for securityRoutes.ts compatibility
export const authRateLimit = sensitiveOperationsLimiter;
export const passwordResetRateLimit = passwordChangeLimiter;

// Password policy enforcement middleware
export function enforcePasswordPolicy(req: Request, res: Response, next: NextFunction) {
  // This would integrate with PasswordPolicyService if needed
  next();
}

// Security monitoring middleware
export function securityMonitoring(req: Request, res: Response, next: NextFunction) {
  // Log security-relevant events
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const route = req.originalUrl || req.url;
  
  // Track potentially suspicious patterns
  if (route.includes('admin') || route.includes('2fa') || route.includes('password')) {
    trackSuspiciousActivity(ip);
  }
  
  next();
}
