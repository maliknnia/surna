// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for Vite in development
        "https://js.stripe.com",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "http:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com",
        "https://www.google-analytics.com",
        "wss:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com"
      ],
      childSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? true : false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// HTTPS enforcement middleware
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.get('Host')}${req.url}`);
    }
  }
  next();
};

// Secure cookie settings
export const secureCookieSettings = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
};

// Brute force protection
export const bruteForceProtection = {
  freeRetries: 3,
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 15 * 60 * 1000, // 15 minutes
  failureExpiry: 15 * 60, // 15 minutes
  handleStoreError: (err: Error) => {
    console.error('Brute force store error:', err);
  }
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// API security middleware
export const apiSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers for API responses
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Prevent API responses from being cached
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  }
  
  next();
};

// Security event logging
export interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'SUSPICIOUS_ACTIVITY' | 'ACCESS_DENIED' | 'RATE_LIMIT_HIT' | 'INVALID_INPUT';
  userId?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  details?: any;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export const logSecurityEvent = (event: SecurityEvent) => {
  console.warn(`[SECURITY] ${event.type} - ${event.severity}`, {
    ...event,
    timestamp: event.timestamp.toISOString()
  });
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production' && event.severity === 'CRITICAL') {
    // Integration with external security monitoring
    // Example: send to SIEM, Splunk, or other monitoring service
  }
};

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Monitor for suspicious patterns
  const suspiciousPatterns = [
    /(\.|\/)(git|svn|env|config|backup|admin|test|dev)/i,
    /(select|insert|update|delete|drop|create|alter|exec|union|script)/i,
    /<script|javascript:|onload=|onerror=/i,
    /\.\.\/|\.\.\\|\.\.\//,
    /(cmd|powershell|bash|sh|exec)/i
  ];

  const checkSuspiciousActivity = (value: string) => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  let suspicious = false;
  const checkValues = [
    req.url,
    req.get('User-Agent') || '',
    JSON.stringify(req.query),
    JSON.stringify(req.body)
  ];

  for (const value of checkValues) {
    if (checkSuspiciousActivity(value)) {
      suspicious = true;
      break;
    }
  }

  if (suspicious) {
    logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip: req.ip ?? req.socket.remoteAddress ?? '',
      userAgent: req.get('User-Agent') || '',
      path: req.path,
      method: req.method,
      details: { query: req.query, body: req.body },
      timestamp: new Date(),
      severity: 'HIGH'
    });

    return res.status(403).json({
      error: 'Request blocked due to suspicious activity'
    });
  }

  next();
};