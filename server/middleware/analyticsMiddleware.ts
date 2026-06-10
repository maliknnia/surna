// Stage 5: Analytics Middleware for Automatic Event Tracking - TEMPORARILY DISABLED
import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to include analytics session
declare global {
  namespace Express {
    interface Request {
      analyticsSessionId?: string;
      analyticsPageViews?: number;
      analyticsActions?: number;
    }
  }
}

// Analytics middleware to track page views and user actions - TEMPORARILY DISABLED
export function analyticsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Temporarily disabled due to schema mismatch - Stage 25 feature priority
  next();
}

// Session tracking middleware - TEMPORARILY DISABLED
export async function sessionTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Temporarily disabled due to schema mismatch - Stage 25 feature priority
  next();
}

// Helper function to get client IP
export function getClientIpAddress(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
}

// Performance tracking middleware - TEMPORARILY DISABLED
export function performanceTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Temporarily disabled due to schema mismatch - Stage 25 feature priority
  next();
}