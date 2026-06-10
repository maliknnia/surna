// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { securityEvents, users } from "@shared/schema";
import { eq, gte, count, desc } from "drizzle-orm";
import { logSecurityEvent } from "./auditLogging";

export enum SecurityThreatLevel {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

export enum SecurityEventType {
  SUSPICIOUS_LOGIN = "suspicious_login",
  MULTIPLE_FAILED_LOGINS = "multiple_failed_logins",
  ACCOUNT_LOCKOUT = "account_lockout",
  UNUSUAL_ACTIVITY = "unusual_activity",
  POTENTIAL_BRUTE_FORCE = "potential_brute_force",
  SUSPICIOUS_IP = "suspicious_ip",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  DATA_BREACH_ATTEMPT = "data_breach_attempt",
  MALICIOUS_REQUEST = "malicious_request",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
}

export interface SecurityAlert {
  id: string;
  type: SecurityEventType;
  threatLevel: SecurityThreatLevel;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export class SecurityMonitoringService {
  private static readonly MAX_FAILED_LOGINS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 100; // requests per minute
  private static readonly KNOWN_MALICIOUS_IPS = new Set<string>();

  static async recordSecurityEvent(
    type: SecurityEventType,
    threatLevel: SecurityThreatLevel,
    details: {
      userId?: string;
      ipAddress: string;
      userAgent?: string;
      description: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const event: SecurityAlert = {
      id: `SEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      threatLevel,
      ...details,
      timestamp: new Date(),
      resolved: false
    };

    // Store in database
    await db.insert(securityEvents).values({
      id: event.id,
      eventType: type,
      threatLevel,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      description: details.description,
      metadata: details.metadata,
      resolved: false,
      createdAt: event.timestamp
    });

    // Log to audit system
    await logSecurityEvent(type, details.description, {
      threatLevel,
      ipAddress: details.ipAddress,
      userId: details.userId,
      metadata: details.metadata
    });

    // Handle immediate threat response
    await this.handleSecurityEvent(event);
  }

  static async checkSuspiciousLogin(
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    // Check for login from new location/device
    const recentLogins = await db.select()
      .from(securityEvents)
      .where(
        eq(securityEvents.userId, userId),
        gte(securityEvents.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 30 days
      )
      .orderBy(desc(securityEvents.createdAt))
      .limit(10);

    const knownIPs = new Set(recentLogins.map(login => login.ipAddress));
    const isNewIP = !knownIPs.has(ipAddress);
    const isNewDevice = !recentLogins.some(login => login.userAgent === userAgent);

    if (isNewIP || isNewDevice) {
      await this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_LOGIN,
        SecurityThreatLevel.MEDIUM,
        {
          userId,
          ipAddress,
          userAgent,
          description: `Login from ${isNewIP ? 'new IP' : 'new device'}`,
          metadata: { isNewIP, isNewDevice }
        }
      );
      return true;
    }

    return false;
  }

  static async trackFailedLogin(ipAddress: string, userId?: string): Promise<{
    shouldLockout: boolean;
    attemptsRemaining: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Count failed login attempts from this IP in the last hour
    const [{ count: attempts }] = await db.select({ count: count() })
      .from(securityEvents)
      .where(
        eq(securityEvents.eventType, SecurityEventType.MULTIPLE_FAILED_LOGINS),
        eq(securityEvents.ipAddress, ipAddress),
        gte(securityEvents.createdAt, oneHourAgo)
      );

    const newAttemptCount = attempts + 1;
    const shouldLockout = newAttemptCount >= this.MAX_FAILED_LOGINS;

    await this.recordSecurityEvent(
      SecurityEventType.MULTIPLE_FAILED_LOGINS,
      shouldLockout ? SecurityThreatLevel.HIGH : SecurityThreatLevel.MEDIUM,
      {
        userId,
        ipAddress,
        description: `Failed login attempt ${newAttemptCount}/${this.MAX_FAILED_LOGINS}`,
        metadata: { attemptCount: newAttemptCount, shouldLockout }
      }
    );

    if (shouldLockout) {
      await this.recordSecurityEvent(
        SecurityEventType.POTENTIAL_BRUTE_FORCE,
        SecurityThreatLevel.HIGH,
        {
          userId,
          ipAddress,
          description: `Potential brute force attack detected - ${newAttemptCount} failed attempts`,
          metadata: { attemptCount: newAttemptCount }
        }
      );
    }

    return {
      shouldLockout,
      attemptsRemaining: Math.max(0, this.MAX_FAILED_LOGINS - newAttemptCount)
    };
  }

  static async detectUnusualActivity(
    userId: string,
    activityType: string,
    currentRate: number
  ): Promise<boolean> {
    if (currentRate > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      await this.recordSecurityEvent(
        SecurityEventType.UNUSUAL_ACTIVITY,
        SecurityThreatLevel.MEDIUM,
        {
          userId,
          ipAddress: "unknown", // Would be filled from request context
          description: `Unusual ${activityType} activity detected: ${currentRate} actions/minute`,
          metadata: { activityType, rate: currentRate }
        }
      );
      return true;
    }
    return false;
  }

  static async checkMaliciousIP(ipAddress: string): Promise<boolean> {
    if (this.KNOWN_MALICIOUS_IPS.has(ipAddress)) {
      await this.recordSecurityEvent(
        SecurityEventType.SUSPICIOUS_IP,
        SecurityThreatLevel.HIGH,
        {
          ipAddress,
          description: `Request from known malicious IP: ${ipAddress}`,
          metadata: { ipAddress }
        }
      );
      return true;
    }
    return false;
  }

  static async detectSQLInjection(queryString: string, userId?: string): Promise<boolean> {
    const sqlInjectionPatterns = [
      /(\b(select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(union.*select|select.*union)/gi,
      /(\b(or|and)\s+\w+\s*=\s*\w+)/gi,
      /([\'\"];?\s*(or|and)\s+[\'\"]?\w+[\'\"]?\s*=\s*[\'\"]?\w+)/gi,
      /(script|javascript|vbscript|onload|onerror|onclick)/gi
    ];

    const isSuspicious = sqlInjectionPatterns.some(pattern => pattern.test(queryString));

    if (isSuspicious) {
      await this.recordSecurityEvent(
        SecurityEventType.MALICIOUS_REQUEST,
        SecurityThreatLevel.HIGH,
        {
          userId,
          ipAddress: "unknown", // Would be filled from request context
          description: `Potential SQL injection detected in query: ${queryString.substring(0, 100)}...`,
          metadata: { queryString: queryString.substring(0, 500) }
        }
      );
    }

    return isSuspicious;
  }

  private static async handleSecurityEvent(event: SecurityAlert): Promise<void> {
    switch (event.threatLevel) {
      case SecurityThreatLevel.CRITICAL:
        // Immediate lockdown
        if (event.userId) {
          await this.lockUserAccount(event.userId, "Critical security threat detected");
        }
        await this.notifySecurityTeam(event);
        break;

      case SecurityThreatLevel.HIGH:
        // Temporary restrictions
        if (event.type === SecurityEventType.POTENTIAL_BRUTE_FORCE) {
          await this.temporarilyBlockIP(event.ipAddress);
        }
        await this.notifySecurityTeam(event);
        break;

      case SecurityThreatLevel.MEDIUM:
        // Enhanced monitoring
        await this.increaseMonitoring(event.userId || event.ipAddress);
        break;

      case SecurityThreatLevel.LOW:
        // Log only
        break;
    }
  }

  private static async lockUserAccount(userId: string, reason: string): Promise<void> {
    await db.update(users)
      .set({ 
        accountLocked: true,
        lockReason: reason,
        lockedAt: new Date()
      })
      .where(eq(users.id, userId));

    await this.recordSecurityEvent(
      SecurityEventType.ACCOUNT_LOCKOUT,
      SecurityThreatLevel.HIGH,
      {
        userId,
        ipAddress: "system",
        description: `Account locked: ${reason}`,
        metadata: { reason, lockedAt: new Date() }
      }
    );
  }

  private static async temporarilyBlockIP(ipAddress: string): Promise<void> {
    // In a real implementation, this would add the IP to a blocklist
    console.log(`Temporarily blocking IP: ${ipAddress}`);
    
    // Add to blocklist with expiration
    // This could be implemented with Redis or database
  }

  private static async increaseMonitoring(target: string): Promise<void> {
    // Implement enhanced monitoring logic
    console.log(`Increasing monitoring for: ${target}`);
  }

  private static async notifySecurityTeam(event: SecurityAlert): Promise<void> {
    // Send alerts via email, Slack, SMS, etc.
    console.log(`🚨 Security Alert [${event.threatLevel.toUpperCase()}]: ${event.description}`);
    
    // In production, integrate with:
    // - Email notifications
    // - Slack webhooks  
    // - SMS alerts
    // - PagerDuty/OpsGenie
    // - Security Information and Event Management (SIEM) tools
  }

  static async getSecurityDashboard(): Promise<{
    recentEvents: SecurityAlert[];
    threatSummary: Record<SecurityThreatLevel, number>;
    topThreats: Array<{ type: SecurityEventType; count: number }>;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentEvents = await db.select()
      .from(securityEvents)
      .where(gte(securityEvents.createdAt, oneDayAgo))
      .orderBy(desc(securityEvents.createdAt))
      .limit(50);

    const threatSummary = recentEvents.reduce((acc, event) => {
      acc[event.threatLevel as SecurityThreatLevel] = (acc[event.threatLevel as SecurityThreatLevel] || 0) + 1;
      return acc;
    }, {} as Record<SecurityThreatLevel, number>);

    const topThreats = Object.entries(
      recentEvents.reduce((acc, event) => {
        acc[event.eventType as SecurityEventType] = (acc[event.eventType as SecurityEventType] || 0) + 1;
        return acc;
      }, {} as Record<SecurityEventType, number>)
    )
    .map(([type, count]) => ({ type: type as SecurityEventType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

    return {
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        type: event.eventType as SecurityEventType,
        threatLevel: event.threatLevel as SecurityThreatLevel,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        description: event.description,
        metadata: event.metadata,
        timestamp: event.createdAt,
        resolved: event.resolved
      })),
      threatSummary,
      topThreats
    };
  }
}