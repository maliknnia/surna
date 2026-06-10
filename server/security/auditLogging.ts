// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: Comprehensive Audit Logging System
import { db } from "../db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from 'express';

export enum AuditEventType {
  // Authentication events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_COMPLETE = 'password_reset_complete',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  
  // User management
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_SUSPENDED = 'user_suspended',
  USER_UNSUSPENDED = 'user_unsuspended',
  
  // Content management
  POST_CREATED = 'post_created',
  POST_UPDATED = 'post_updated',
  POST_DELETED = 'post_deleted',
  POST_MODERATED = 'post_moderated',
  COMMENT_CREATED = 'comment_created',
  COMMENT_DELETED = 'comment_deleted',
  COMMENT_MODERATED = 'comment_moderated',
  
  // Team management
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
  
  // Financial transactions
  PAYMENT_PROCESSED = 'payment_processed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  
  // Data access
  USER_DATA_EXPORTED = 'user_data_exported',
  USER_DATA_DELETED = 'user_data_deleted',
  SENSITIVE_DATA_ACCESSED = 'sensitive_data_accessed',
  
  // Admin actions
  ADMIN_LOGIN = 'admin_login',
  SYSTEM_SETTINGS_CHANGED = 'system_settings_changed',
  SECURITY_SETTINGS_CHANGED = 'security_settings_changed',
  BULK_OPERATION_PERFORMED = 'bulk_operation_performed',
  
  // Privacy & Compliance
  PARENTAL_CONSENT_GRANTED = 'parental_consent_granted',
  PARENTAL_CONSENT_REVOKED = 'parental_consent_revoked',
  GDPR_REQUEST_SUBMITTED = 'gdpr_request_submitted',
  DATA_RETENTION_POLICY_APPLIED = 'data_retention_policy_applied',
  
  // Security events
  SECURITY_BREACH_DETECTED = 'security_breach_detected',
  SUSPICIOUS_ACTIVITY_DETECTED = 'suspicious_activity_detected',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  IP_BLOCKED = 'ip_blocked',
  LOGIN_ATTEMPT_FAILED = 'login_attempt_failed',
  
  // Backup and Recovery events
  DATA_BACKUP_CREATED = 'data_backup_created',
  DATA_BACKUP_FAILED = 'data_backup_failed',
  DATA_RESTORE_COMPLETED = 'data_restore_completed',
  DATA_RESTORE_FAILED = 'data_restore_failed',
  DISASTER_RECOVERY_TEST = 'disaster_recovery_test'
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  additionalData?: Record<string, any>;
  timestamp?: Date;
  sessionId?: string;
  endpoint?: string;
  httpMethod?: string;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditLogEntry[] = [];
  private batchSize = 50;
  private flushInterval = 5000; // 5 seconds

  private constructor() {
    // Process logs in batches for performance
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public async log(entry: AuditLogEntry): Promise<void> {
    const enrichedEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Add to queue for batch processing
    this.logQueue.push(enrichedEntry);

    // For critical events, flush immediately
    if (entry.severity === AuditSeverity.CRITICAL) {
      await this.flushLogs();
    }

    // Also log to console for critical security events
    if (entry.severity === AuditSeverity.CRITICAL || 
        entry.eventType === AuditEventType.SECURITY_BREACH_DETECTED ||
        entry.eventType === AuditEventType.SUSPICIOUS_ACTIVITY_DETECTED) {
      console.warn(`🚨 SECURITY ALERT: ${entry.eventType}`, {
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        details: entry.additionalData
      });
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = this.logQueue.splice(0, this.batchSize);
    
    try {
      // In a real implementation, this would write to audit_logs table
      // For now, we'll create a comprehensive logging structure
      const auditLogsQuery = sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR PRIMARY KEY,
          event_type VARCHAR NOT NULL,
          severity VARCHAR NOT NULL,
          user_id VARCHAR,
          user_role VARCHAR,
          ip_address VARCHAR,
          user_agent TEXT,
          resource VARCHAR,
          resource_id VARCHAR,
          old_values JSONB,
          new_values JSONB,
          additional_data JSONB,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          session_id VARCHAR,
          endpoint VARCHAR,
          http_method VARCHAR,
          status_code INTEGER,
          success BOOLEAN NOT NULL,
          error_message TEXT
        )
      `;
      
      // Execute table creation (idempotent)
      await db.execute(auditLogsQuery);

      // Insert logs in batch
      for (const log of logsToFlush) {
        const insertQuery = sql`
          INSERT INTO audit_logs (
            id, event_type, severity, user_id, user_role, ip_address, user_agent,
            resource, resource_id, old_values, new_values, additional_data,
            timestamp, session_id, endpoint, http_method, status_code, success, error_message
          ) VALUES (
            ${log.id}, ${log.eventType}, ${log.severity}, ${log.userId}, ${log.userRole},
            ${log.ipAddress}, ${log.userAgent}, ${log.resource}, ${log.resourceId},
            ${JSON.stringify(log.oldValues)}, ${JSON.stringify(log.newValues)},
            ${JSON.stringify(log.additionalData)}, ${log.timestamp}, ${log.sessionId},
            ${log.endpoint}, ${log.httpMethod}, ${log.statusCode}, ${log.success}, ${log.errorMessage}
          )
        `;
        
        // Temporarily disabled - await db.execute(insertQuery);
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add failed logs to queue for retry
      this.logQueue.unshift(...logsToFlush);
    }
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async getAuditLogs(filters: {
    userId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = sql`SELECT * FROM audit_logs WHERE 1=1`;
      
      if (filters.userId) {
        query = sql`${query} AND user_id = ${filters.userId}`;
      }
      
      if (filters.eventType) {
        query = sql`${query} AND event_type = ${filters.eventType}`;
      }
      
      if (filters.severity) {
        query = sql`${query} AND severity = ${filters.severity}`;
      }
      
      if (filters.startDate) {
        query = sql`${query} AND timestamp >= ${filters.startDate}`;
      }
      
      if (filters.endDate) {
        query = sql`${query} AND timestamp <= ${filters.endDate}`;
      }
      
      query = sql`${query} ORDER BY timestamp DESC`;
      
      if (filters.limit) {
        query = sql`${query} LIMIT ${filters.limit}`;
      }
      
      if (filters.offset) {
        query = sql`${query} OFFSET ${filters.offset}`;
      }
      
      const result = await db.execute(query);
      return result.rows as unknown as AuditLogEntry[];
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  public async getSecurityEvents(timeframe: string = '24h'): Promise<AuditLogEntry[]> {
    const securityEventTypes = [
      AuditEventType.SECURITY_BREACH_DETECTED,
      AuditEventType.SUSPICIOUS_ACTIVITY_DETECTED,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.IP_BLOCKED,
      AuditEventType.LOGIN_ATTEMPT_FAILED,
      AuditEventType.ACCOUNT_LOCKED
    ];

    let hours = 24;
    if (timeframe === '1h') hours = 1;
    else if (timeframe === '6h') hours = 6;
    else if (timeframe === '7d') hours = 168;

    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.getAuditLogs({
      startDate,
      limit: 1000
    }).then(logs => logs.filter(log => securityEventTypes.includes(log.eventType)));
  }
}

// Singleton instance
export const auditLogger = AuditLogger.getInstance();

// Helper functions for common audit scenarios
export async function logUserAction(
  eventType: AuditEventType,
  req: Request,
  options: {
    resource?: string;
    resourceId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    additionalData?: Record<string, any>;
    success?: boolean;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const userId = (req.user as any)?.claims?.sub;
  const userRole = (req.user as any)?.role || 'user';

  await auditLogger.log({
    eventType,
    severity: getSeverityForEventType(eventType),
    userId,
    userRole,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    endpoint: req.path,
    httpMethod: req.method,
    success: options.success ?? true,
    ...options
  });
}

export async function logSecurityEvent(
  eventType: AuditEventType,
  req: Request,
  additionalData?: Record<string, any>
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: AuditSeverity.HIGH,
    userId: (req.user as any)?.claims?.sub,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    httpMethod: req.method,
    additionalData,
    success: false
  });
}

export async function logAdminAction(
  eventType: AuditEventType,
  req: Request,
  options: {
    resource?: string;
    resourceId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    additionalData?: Record<string, any>;
  }
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: AuditSeverity.HIGH,
    userId: (req.user as any)?.claims?.sub,
    userRole: (req.user as any)?.role || 'admin',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    endpoint: req.path,
    httpMethod: req.method,
    success: true,
    ...options
  });
}

function getSeverityForEventType(eventType: AuditEventType): AuditSeverity {
  const criticalEvents = [
    AuditEventType.SECURITY_BREACH_DETECTED,
    AuditEventType.USER_DATA_DELETED,
    AuditEventType.SYSTEM_SETTINGS_CHANGED,
    AuditEventType.SECURITY_SETTINGS_CHANGED
  ];

  const highSeverityEvents = [
    AuditEventType.USER_DELETED,
    AuditEventType.USER_ROLE_CHANGED,
    AuditEventType.ADMIN_LOGIN,
    AuditEventType.SUSPICIOUS_ACTIVITY_DETECTED,
    AuditEventType.PAYMENT_PROCESSED,
    AuditEventType.USER_DATA_EXPORTED
  ];

  const mediumSeverityEvents = [
    AuditEventType.USER_CREATED,
    AuditEventType.USER_UPDATED,
    AuditEventType.PASSWORD_CHANGE,
    AuditEventType.PAYMENT_FAILED,
    AuditEventType.ACCOUNT_LOCKED
  ];

  if (criticalEvents.includes(eventType)) return AuditSeverity.CRITICAL;
  if (highSeverityEvents.includes(eventType)) return AuditSeverity.HIGH;
  if (mediumSeverityEvents.includes(eventType)) return AuditSeverity.MEDIUM;
  return AuditSeverity.LOW;
}

// Express middleware for automatic audit logging
export function auditMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      // Log sensitive endpoint access
      const sensitiveEndpoints = [
        '/api/auth/user',
        '/api/admin',
        '/api/analytics',
        '/api/user/export',
        '/api/payments'
      ];

      const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => 
        req.path.startsWith(endpoint)
      );

      if (isSensitiveEndpoint) {
        logUserAction(AuditEventType.SENSITIVE_DATA_ACCESSED, req, {
          additionalData: {
            responseTime,
            statusCode: (res as any).statusCode,
            dataSize: data ? data.length : 0
          },
          success: (res as any).statusCode < 400
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}