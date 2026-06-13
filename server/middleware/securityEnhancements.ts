import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Production-ready security headers
export function productionSecurityMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Allow inline styles for UI components
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net", // For external stylesheets if needed
          "https://unpkg.com" // Phosphor icon stylesheets
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for React/Vite in dev
          "'unsafe-eval'", // Required for development
          "https://js.stripe.com", // Stripe payment processing
          "https://www.google.com", // Google services
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://unpkg.com",
          "https://tiles.openfreemap.org",
          "https://api.maptiler.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:", // Allow all HTTPS images for user uploads
          process.env.S3_PUBLIC_BASE_URL || "https://surna.nyc3.digitaloceanspaces.com"
        ],
        mediaSrc: [
          "'self'",
          "blob:",
          process.env.S3_PUBLIC_BASE_URL || "https://surna.nyc3.digitaloceanspaces.com"
        ],
        connectSrc: [
          "'self'",
          "ws:", "wss:", // WebSocket connections
          "https:", // API calls
          process.env.S3_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
          "https://api.stripe.com", // Stripe payments
          "https://api.maptiler.com",
          "https://tiles.openfreemap.org",
        ],
        workerSrc: [
          "'self'",
          "blob:", // MapLibre GL workers
        ],
        childSrc: [
          "'self'",
          "blob:",
        ],
        frameSrc: [
          "'none'"
        ],
        objectSrc: [
          "'none'"
        ],
        baseUri: [
          "'self'"
        ],
        formAction: [
          "'self'"
        ],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { 
      action: 'deny' 
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { 
      policy: "strict-origin-when-cross-origin" 
    },
  });
}

// Additional security headers middleware
export function additionalSecurityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy (restrict browser features; allow geolocation on map)
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(self), payment=()'
    );
    
    // Expect-CT header for certificate transparency
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Expect-CT', 'max-age=86400, enforce');
    }
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
  };
}

// Rate limiting specifically for authentication routes
export function authSecurityMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add timing attack prevention for auth routes
    if (req.path.includes('/auth/') || req.path.includes('/login')) {
      // Add small random delay to prevent timing attacks
      const delay = Math.random() * 50; // 0-50ms random delay
      setTimeout(() => next(), delay);
    } else {
      next();
    }
  };
}