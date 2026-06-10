/**
 * Frontend Security Guards
 * Package S - Client-side security utilities
 */

import { queryClient } from "./queryClient";

// Auto-logout on 401 Unauthorized
export function setupAuthInterceptor() {
  // This is handled by the default fetcher in queryClient.ts
  // The fetcher already throws on 401 and the error boundary can catch it
}

// Handle token expiration (419)
export function handleTokenExpiration() {
  // Clear all queries
  queryClient.clear();
  
  // Redirect to login
  window.location.href = "/";
}

// Secure clipboard copy
export async function secureCopyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

// Redact sensitive data for display
export function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function redactPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length < 4) {
    return phone;
  }
  
  // Show last 4 digits only
  return `***-***-${digits.slice(-4)}`;
}

// Check if re-authentication is needed
export function needsReauth(lastAuthTime: number | null, maxAge: number = 5 * 60 * 1000): boolean {
  if (!lastAuthTime) return true;
  return Date.now() - lastAuthTime > maxAge;
}

// Session timeout warning
let timeoutWarningId: number | null = null;
let timeoutId: number | null = null;

export function setupSessionTimeout(
  warningMinutes: number = 25,
  logoutMinutes: number = 30,
  onWarning: () => void,
  onLogout: () => void
) {
  // Clear existing timers
  if (timeoutWarningId) window.clearTimeout(timeoutWarningId);
  if (timeoutId) window.clearTimeout(timeoutId);
  
  // Set warning timer
  timeoutWarningId = window.setTimeout(() => {
    onWarning();
  }, warningMinutes * 60 * 1000);
  
  // Set logout timer
  timeoutId = window.setTimeout(() => {
    onLogout();
  }, logoutMinutes * 60 * 1000);
}

export function resetSessionTimeout(
  warningMinutes: number = 25,
  logoutMinutes: number = 30,
  onWarning: () => void,
  onLogout: () => void
) {
  setupSessionTimeout(warningMinutes, logoutMinutes, onWarning, onLogout);
}

// Prevent sensitive data from being logged
export function sanitizeForLog(obj: any): any {
  const sensitive = ["password", "token", "secret", "key", "ssn", "creditCard"];
  
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLog);
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Content Security Policy violation reporting
export function setupCSPReporting() {
  document.addEventListener("securitypolicyviolation", (e) => {
    console.warn("CSP Violation:", {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    });
    
    // In production, report to server
    // fetch("/api/security/csp-report", { ... });
  });
}

// Detect suspicious activity
export function detectSuspiciousActivity(): boolean {
  // Check for suspicious patterns
  const checks = [
    // Check if DevTools is open (basic check)
    window.outerWidth - window.innerWidth > 160,
    window.outerHeight - window.innerHeight > 160,
    
    // Check for common debugging tools
    //@ts-ignore
    !!window.eruda || !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__
  ];
  
  return checks.some(Boolean);
}

// Rate limit client-side actions
const actionTimestamps = new Map<string, number[]>();

export function isRateLimited(action: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = actionTimestamps.get(action) || [];
  
  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);
  
  if (recentTimestamps.length >= maxAttempts) {
    return true;
  }
  
  recentTimestamps.push(now);
  actionTimestamps.set(action, recentTimestamps);
  
  return false;
}

// Validate external URLs before navigation
export function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ["http:", "https:"];
    const allowedDomains = [
      window.location.hostname,
      "replit.com",
      "replit.app",
      // Add other trusted domains
    ];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }
    
    // Allow same-origin
    if (parsed.hostname === window.location.hostname) {
      return true;
    }
    
    // Check against allowlist
    return allowedDomains.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Initialize all frontend security features
export function initializeFrontendSecurity() {
  setupAuthInterceptor();
  setupCSPReporting();
  
  // Listen for auth errors globally
  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason?.status === 401) {
      console.log("Session expired, redirecting to login...");
      window.location.href = "/";
    } else if (event.reason?.status === 419) {
      handleTokenExpiration();
    }
  });
  
  console.log("🔒 Frontend security initialized");
}
