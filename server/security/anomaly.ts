// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request } from "express";
import geoip from "geoip-lite";

interface LoginAttempt {
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: number;
  success: boolean;
  location?: {
    country: string;
    city: string;
  };
}

// In-memory store (use Redis in production)
const loginHistory = new Map<string, LoginAttempt[]>();
const failedAttempts = new Map<string, number>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ANOMALY_THRESHOLD = 0.7; // 70% difference triggers alert

export function recordLoginAttempt(
  userId: string,
  ip: string,
  userAgent: string,
  success: boolean
): void {
  const geo = geoip.lookup(ip);
  const attempt: LoginAttempt = {
    userId,
    ip,
    userAgent,
    timestamp: Date.now(),
    success,
    location: geo ? {
      country: geo.country,
      city: geo.city
    } : undefined
  };
  
  // Store in history
  const history = loginHistory.get(userId) || [];
  history.push(attempt);
  
  // Keep last 50 attempts
  if (history.length > 50) {
    history.shift();
  }
  loginHistory.set(userId, history);
  
  // Track failed attempts
  if (!success) {
    const count = (failedAttempts.get(userId) || 0) + 1;
    failedAttempts.set(userId, count);
    
    // Auto-cleanup after lockout duration
    setTimeout(() => {
      failedAttempts.delete(userId);
    }, LOCKOUT_DURATION);
  } else {
    failedAttempts.delete(userId);
  }
}

export function isAccountLocked(userId: string): boolean {
  const count = failedAttempts.get(userId) || 0;
  return count >= MAX_FAILED_ATTEMPTS;
}

export function detectLoginAnomaly(userId: string, ip: string, userAgent: string): {
  isAnomalous: boolean;
  reason?: string;
  confidence: number;
} {
  const history = loginHistory.get(userId) || [];
  
  if (history.length < 3) {
    // Not enough history to detect anomalies
    return { isAnomalous: false, confidence: 0 };
  }
  
  const recentSuccessful = history
    .filter(a => a.success)
    .slice(-10); // Last 10 successful logins
  
  if (recentSuccessful.length === 0) {
    return { isAnomalous: false, confidence: 0 };
  }
  
  // Check geo-location anomaly
  const geo = geoip.lookup(ip);
  if (geo) {
    const recentCountries = recentSuccessful
      .filter(a => a.location)
      .map(a => a.location!.country);
    
    const uniqueCountries = new Set(recentCountries);
    const currentCountry = geo.country;
    
    if (!uniqueCountries.has(currentCountry) && uniqueCountries.size > 0) {
      return {
        isAnomalous: true,
        reason: "new_country",
        confidence: 0.8
      };
    }
  }
  
  // Check user agent anomaly
  const recentUAs = recentSuccessful.map(a => a.userAgent);
  const uniqueUAs = new Set(recentUAs);
  
  if (!uniqueUAs.has(userAgent) && uniqueUAs.size > 0) {
    return {
      isAnomalous: true,
      reason: "new_device",
      confidence: 0.6
    };
  }
  
  // Check time-based anomaly (unusual login time)
  const hour = new Date().getHours();
  const recentHours = recentSuccessful.map(a => new Date(a.timestamp).getHours());
  const avgHour = recentHours.reduce((a, b) => a + b, 0) / recentHours.length;
  const hourDiff = Math.abs(hour - avgHour);
  
  if (hourDiff > 6) {
    return {
      isAnomalous: true,
      reason: "unusual_time",
      confidence: 0.5
    };
  }
  
  return { isAnomalous: false, confidence: 0 };
}

// Payment anomaly detection
interface PaymentAttempt {
  userId: string;
  amount: number;
  timestamp: number;
  success: boolean;
}

const paymentHistory = new Map<string, PaymentAttempt[]>();

export function recordPaymentAttempt(
  userId: string,
  amount: number,
  success: boolean
): void {
  const attempt: PaymentAttempt = {
    userId,
    amount,
    timestamp: Date.now(),
    success
  };
  
  const history = paymentHistory.get(userId) || [];
  history.push(attempt);
  
  // Keep last 100 payments
  if (history.length > 100) {
    history.shift();
  }
  paymentHistory.set(userId, history);
}

export function detectPaymentAnomaly(userId: string, amount: number): {
  isAnomalous: boolean;
  reason?: string;
  confidence: number;
} {
  const history = paymentHistory.get(userId) || [];
  
  if (history.length < 5) {
    return { isAnomalous: false, confidence: 0 };
  }
  
  const recentSuccessful = history
    .filter(p => p.success)
    .slice(-20);
  
  if (recentSuccessful.length === 0) {
    return { isAnomalous: false, confidence: 0 };
  }
  
  // Calculate average payment amount
  const avgAmount = recentSuccessful.reduce((sum, p) => sum + p.amount, 0) / recentSuccessful.length;
  const maxAmount = Math.max(...recentSuccessful.map(p => p.amount));
  
  // Check if amount is significantly higher than average
  if (amount > avgAmount * 3) {
    return {
      isAnomalous: true,
      reason: "unusually_high_amount",
      confidence: 0.9
    };
  }
  
  // Check if amount is higher than historical max
  if (amount > maxAmount * 2) {
    return {
      isAnomalous: true,
      reason: "exceeds_historical_max",
      confidence: 0.85
    };
  }
  
  // Check for rapid successive payments
  const last5Min = Date.now() - 5 * 60 * 1000;
  const recentPayments = history.filter(p => p.timestamp > last5Min);
  
  if (recentPayments.length > 10) {
    return {
      isAnomalous: true,
      reason: "rapid_payment_burst",
      confidence: 0.95
    };
  }
  
  return { isAnomalous: false, confidence: 0 };
}

// Rate limit violation detection
const rateLimitViolations = new Map<string, number[]>();

export function recordRateLimitViolation(identifier: string): void {
  const violations = rateLimitViolations.get(identifier) || [];
  violations.push(Date.now());
  
  // Keep last 100 violations
  if (violations.length > 100) {
    violations.shift();
  }
  rateLimitViolations.set(identifier, violations);
}

export function isUnderAttack(identifier: string): boolean {
  const violations = rateLimitViolations.get(identifier) || [];
  const last10Min = Date.now() - 10 * 60 * 1000;
  const recentViolations = violations.filter(t => t > last10Min);
  
  // More than 20 violations in 10 minutes = attack
  return recentViolations.length > 20;
}

// Extract client fingerprint from request
export function getClientFingerprint(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  const acceptLang = req.headers["accept-language"] || "unknown";
  
  return `${ip}|${ua}|${acceptLang}`;
}

// Cleanup old data periodically
setInterval(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  
  for (const [userId, history] of loginHistory.entries()) {
    const filtered = history.filter(a => a.timestamp > cutoff);
    if (filtered.length === 0) {
      loginHistory.delete(userId);
    } else {
      loginHistory.set(userId, filtered);
    }
  }
  
  for (const [userId, history] of paymentHistory.entries()) {
    const filtered = history.filter(p => p.timestamp > cutoff);
    if (filtered.length === 0) {
      paymentHistory.delete(userId);
    } else {
      paymentHistory.set(userId, filtered);
    }
  }
}, 24 * 60 * 60 * 1000); // Daily cleanup
