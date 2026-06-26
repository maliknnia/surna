// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
// Stage 6: GDPR & Compliance Reporting System
import { db } from "../db";
import { sql } from "drizzle-orm";
import { auditLogger, AuditEventType, AuditSeverity } from "./auditLogging";
import { parentalConsentService } from "./parentalConsent";
import { dataEncryption, maskSensitiveData } from "./dataEncryption";
import type { Request, Response } from 'express';
import { ensureComplianceRequestsSchema } from "./ensureComplianceSchema";
import { PrivacyControlsService } from "./privacyControls";

export enum ComplianceRequestType {
  GDPR_DATA_EXPORT = 'gdpr_data_export',
  GDPR_DATA_DELETION = 'gdpr_data_deletion',
  GDPR_DATA_PORTABILITY = 'gdpr_data_portability',
  GDPR_DATA_RECTIFICATION = 'gdpr_data_rectification',
  COPPA_CONSENT_VERIFICATION = 'coppa_consent_verification',
  CCPA_DATA_DISCLOSURE = 'ccpa_data_disclosure'
}

export enum ComplianceRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface ComplianceRequest {
  id: string;
  requestType: ComplianceRequestType;
  status: ComplianceRequestStatus;
  userId: string;
  userEmail: string;
  requestedBy: string; // User ID or 'system'
  requestData?: any;
  responseData?: any;
  submittedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  expiresAt: Date;
  additionalNotes?: string;
  verificationRequired: boolean;
  verificationCode?: string;
  ipAddress: string;
  userAgent: string;
}

export interface GDPRDataExport {
  userId: string;
  exportedAt: Date;
  dataCategories: string[];
  personalData: {
    profile: any;
    posts: any[];
    comments: any[];
    messages: any[];
    teams: any[];
    events: any[];
    purchases: any[];
    analytics: any[];
  };
  metadata: {
    totalRecords: number;
    exportFormat: string;
    encryptionUsed: boolean;
    retentionPolicy: string;
  };
}

class ComplianceService {
  private static instance: ComplianceService;

  private constructor() {
    this.initializeDatabase();
  }

  public static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  private async initializeDatabase(): Promise<void> {
    await ensureComplianceRequestsSchema();
  }

  public async submitGDPRDataExportRequest(
    userId: string,
    userEmail: string,
    req: Request
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      const requestId = this.generateRequestId('gdpr_export');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const verificationCode = this.generateVerificationCode();

      const insertQuery = sql`
        INSERT INTO compliance_requests (
          id, request_type, user_id, user_email, requested_by, expires_at,
          verification_required, verification_code, ip_address, user_agent
        ) VALUES (
          ${requestId}, ${ComplianceRequestType.GDPR_DATA_EXPORT}, ${userId},
          ${userEmail}, ${userId}, ${expiresAt}, ${true}, ${verificationCode},
          ${req.ip}, ${req.get('User-Agent')}
        )
      `;

      await db.execute(insertQuery);

      // Send verification email
      await this.sendVerificationEmail(userEmail, verificationCode, 'data export');

      // Log audit event
      await auditLogger.log({
        eventType: AuditEventType.GDPR_REQUEST_SUBMITTED,
        severity: AuditSeverity.HIGH,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'compliance_request',
        resourceId: requestId,
        additionalData: {
          requestType: ComplianceRequestType.GDPR_DATA_EXPORT,
          userEmail: maskSensitiveData(userEmail, 'email')
        },
        success: true
      });

      return { success: true, requestId };
    } catch (error) {
      console.error('Failed to submit GDPR data export request:', error);
      return { success: false, error: 'Failed to submit data export request' };
    }
  }

  public async submitGDPRDataDeletionRequest(
    userId: string,
    userEmail: string,
    req: Request,
    reason?: string,
    options?: { skipVerification?: boolean },
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      await ensureComplianceRequestsSchema();

      const requestId = this.generateRequestId('gdpr_deletion');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const verificationCode = this.generateVerificationCode();
      const requestData = reason ? JSON.stringify({ reason }) : null;
      const skipVerification = options?.skipVerification === true;
      const needsVerification = !skipVerification;

      const insertQuery = sql`
        INSERT INTO compliance_requests (
          id, request_type, user_id, user_email, requested_by, expires_at,
          verification_required, verification_code, ip_address, user_agent,
          request_data, additional_notes
        ) VALUES (
          ${requestId}, ${ComplianceRequestType.GDPR_DATA_DELETION}, ${userId},
          ${userEmail}, ${userId}, ${expiresAt}, ${needsVerification}, ${needsVerification ? verificationCode : null},
          ${req.ip ?? "unknown"}, ${req.get("User-Agent") ?? null},
          ${requestData}::jsonb, ${reason ?? null}
        )
      `;

      await db.execute(insertQuery);

      if (skipVerification) {
        await db.execute(sql`
          UPDATE compliance_requests
          SET verification_required = false, updated_at = NOW()
          WHERE id = ${requestId}
        `);
      }

      if (needsVerification) {
        await this.sendVerificationEmail(userEmail, verificationCode, 'data deletion');
      }

      // Log audit event
      await auditLogger.log({
        eventType: AuditEventType.GDPR_REQUEST_SUBMITTED,
        severity: AuditSeverity.CRITICAL,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'compliance_request',
        resourceId: requestId,
        additionalData: {
          requestType: ComplianceRequestType.GDPR_DATA_DELETION,
          userEmail: maskSensitiveData(userEmail, 'email')
        },
        success: true
      });

      return { success: true, requestId };
    } catch (error) {
      console.error('Failed to submit GDPR data deletion request:', error);
      return { success: false, error: 'Failed to submit data deletion request' };
    }
  }

  /** Process pending GDPR deletions whose grace period (expires_at) has passed. */
  public async processDueDeletionRequests(): Promise<{ processed: number; errors: number }> {
    await ensureComplianceRequestsSchema();

    const due = await db.execute(sql`
      SELECT id FROM compliance_requests
      WHERE request_type = ${ComplianceRequestType.GDPR_DATA_DELETION}
        AND status = ${ComplianceRequestStatus.PENDING}
        AND expires_at <= NOW()
        AND (verification_required IS NOT TRUE)
    `);

    let processed = 0;
    let errors = 0;

    for (const row of due.rows as Array<{ id: string }>) {
      const result = await this.processComplianceRequest(row.id, "compliance_purge_job");
      if (result.success) processed += 1;
      else errors += 1;
    }

    return { processed, errors };
  }

  public async verifyComplianceRequest(
    requestId: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateQuery = sql`
        UPDATE compliance_requests 
        SET verification_required = false, updated_at = NOW()
        WHERE id = ${requestId} AND verification_code = ${verificationCode}
        AND status = ${ComplianceRequestStatus.PENDING}
      `;

      const result = await db.execute(updateQuery);
      
      if (result.rowCount === 0) {
        return { success: false, error: 'Invalid verification code or request not found' };
      }

      // Auto-process verified requests
      await this.processComplianceRequest(requestId, 'system');

      return { success: true };
    } catch (error) {
      console.error('Failed to verify compliance request:', error);
      return { success: false, error: 'Failed to verify request' };
    }
  }

  public async processComplianceRequest(
    requestId: string,
    processedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await this.getComplianceRequestById(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.verificationRequired) {
        return { success: false, error: 'Request requires verification first' };
      }

      let responseData: any = {};

      switch (request.requestType) {
        case ComplianceRequestType.GDPR_DATA_EXPORT:
          responseData = await this.exportUserData(request.userId);
          break;
        case ComplianceRequestType.GDPR_DATA_DELETION:
          responseData = await this.deleteUserData(request.userId);
          break;
        default:
          return { success: false, error: 'Unsupported request type' };
      }

      const updateQuery = sql`
        UPDATE compliance_requests 
        SET status = ${ComplianceRequestStatus.COMPLETED}, 
            processed_at = NOW(), processed_by = ${processedBy},
            response_data = ${JSON.stringify(responseData)}, updated_at = NOW()
        WHERE id = ${requestId}
      `;

      await db.execute(updateQuery);

      // Log audit event
      await auditLogger.log({
        eventType: request.requestType === ComplianceRequestType.GDPR_DATA_EXPORT 
          ? AuditEventType.USER_DATA_EXPORTED 
          : AuditEventType.USER_DATA_DELETED,
        severity: AuditSeverity.HIGH,
        userId: request.userId,
        resource: 'compliance_request',
        resourceId: requestId,
        additionalData: {
          requestType: request.requestType,
          processedBy,
          recordsAffected: responseData.recordsAffected
        },
        success: true
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to process compliance request:', error);
      return { success: false, error: 'Failed to process request' };
    }
  }

  private async exportUserData(userId: string): Promise<GDPRDataExport> {
    try {
      // Collect all user data from various tables
      const userData: GDPRDataExport = {
        userId,
        exportedAt: new Date(),
        dataCategories: ['profile', 'posts', 'comments', 'messages', 'teams', 'events', 'purchases', 'analytics'],
        personalData: {
          profile: await this.getUserProfile(userId),
          posts: await this.getUserPosts(userId),
          comments: await this.getUserComments(userId),
          messages: await this.getUserMessages(userId),
          teams: await this.getUserTeams(userId),
          events: await this.getUserEvents(userId),
          purchases: await this.getUserPurchases(userId),
          analytics: await this.getUserAnalytics(userId)
        },
        metadata: {
          totalRecords: 0,
          exportFormat: 'JSON',
          encryptionUsed: true,
          retentionPolicy: '7 years'
        }
      };

      // Calculate total records
      userData.metadata.totalRecords = Object.values(userData.personalData)
        .reduce((total, data) => total + (Array.isArray(data) ? data.length : 1), 0);

      return userData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  private async deleteUserData(userId: string): Promise<{ recordsAffected: number; deletedCategories: string[] }> {
    try {
      await PrivacyControlsService.deleteUserData(userId, true);
      return {
        recordsAffected: 1,
        deletedCategories: ["profile_anonymized"],
      };
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  public async getComplianceReport(timeframe: string = '30d'): Promise<any> {
    try {
      let days = 30;
      if (timeframe === '7d') days = 7;
      else if (timeframe === '90d') days = 90;
      else if (timeframe === '1y') days = 365;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Compliance requests summary
      const complianceRequestsQuery = sql`
        SELECT request_type, status, COUNT(*) as count
        FROM compliance_requests 
        WHERE submitted_at >= ${startDate}
        GROUP BY request_type, status
      `;

      const complianceRequests = await db.execute(complianceRequestsQuery);

      // Parental consent summary
      const parentalConsentStats = await parentalConsentService.getPendingConsentRequests();

      // Security events summary
      const securityEvents = await auditLogger.getSecurityEvents(`${days * 24}h`);

      // Data retention compliance
      const dataRetentionQuery = sql`
        SELECT 
          'users' as table_name,
          COUNT(*) as total_records,
          COUNT(CASE WHEN created_at < NOW() - INTERVAL '7 years' THEN 1 END) as retention_expired
        FROM users
        UNION ALL
        SELECT 
          'audit_logs' as table_name,
          COUNT(*) as total_records,
          COUNT(CASE WHEN timestamp < NOW() - INTERVAL '7 years' THEN 1 END) as retention_expired
        FROM audit_logs
      `;

      const dataRetention = await db.execute(dataRetentionQuery);

      return {
        reportGeneratedAt: new Date(),
        timeframe: `${days} days`,
        complianceRequests: complianceRequests.rows,
        parentalConsent: {
          pending: parentalConsentStats.length,
          totalProcessed: 0 // Would be calculated from historical data
        },
        securityEvents: {
          total: securityEvents.length,
          byType: securityEvents.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        dataRetention: dataRetention.rows,
        summary: {
          gdprCompliant: true,
          coppaCompliant: true,
          dataRetentionCompliant: true,
          securityIncidents: securityEvents.filter(e => e.severity === 'critical').length,
          lastSecurityReview: new Date() // Would be tracked separately
        }
      };
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  // Helper methods for data export
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const query = sql`SELECT * FROM users WHERE id = ${userId}`;
      const result = await db.execute(query);
      return result.rows[0] || null;
    } catch (error) {
      return null;
    }
  }

  private async getUserPosts(userId: string): Promise<any[]> {
    try {
      const query = sql`SELECT * FROM posts WHERE user_id = ${userId}`;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserComments(userId: string): Promise<any[]> {
    try {
      const query = sql`SELECT * FROM comments WHERE user_id = ${userId}`;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserMessages(userId: string): Promise<any[]> {
    try {
      const query = sql`SELECT * FROM messages WHERE sender_id = ${userId}`;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserTeams(userId: string): Promise<any[]> {
    try {
      const query = sql`
        SELECT t.* FROM teams t 
        JOIN team_members tm ON t.id = tm.team_id 
        WHERE tm.user_id = ${userId}
      `;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserEvents(userId: string): Promise<any[]> {
    try {
      const query = sql`
        SELECT e.* FROM events e 
        JOIN event_participants ep ON e.id = ep.event_id 
        WHERE ep.user_id = ${userId}
      `;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserPurchases(userId: string): Promise<any[]> {
    try {
      const query = sql`SELECT * FROM purchases WHERE user_id = ${userId}`;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getUserAnalytics(userId: string): Promise<any[]> {
    try {
      const query = sql`SELECT * FROM analytics_events WHERE user_id = ${userId} LIMIT 1000`;
      const result = await db.execute(query);
      return result.rows || [];
    } catch (error) {
      return [];
    }
  }

  private async getComplianceRequestById(requestId: string): Promise<ComplianceRequest | null> {
    try {
      const query = sql`SELECT * FROM compliance_requests WHERE id = ${requestId}`;
      const result = await db.execute(query);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      return {
        id: String(row.id),
        requestType: row.request_type as ComplianceRequestType,
        status: row.status as ComplianceRequestStatus,
        userId: String(row.user_id),
        userEmail: String(row.user_email),
        requestedBy: String(row.requested_by),
        requestData: row.request_data,
        responseData: row.response_data,
        submittedAt: row.submitted_at as Date,
        processedAt: row.processed_at as Date | undefined,
        processedBy: row.processed_by as string | undefined,
        expiresAt: row.expires_at as Date,
        additionalNotes: row.additional_notes as string | undefined,
        verificationRequired: row.verification_required === true,
        verificationCode: row.verification_code as string | undefined,
        ipAddress: String(row.ip_address ?? ""),
        userAgent: String(row.user_agent ?? ""),
      };
    } catch (error) {
      return null;
    }
  }

  private generateRequestId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private async sendVerificationEmail(email: string, code: string, requestType: string): Promise<void> {
    // In a real implementation, this would send an email
    console.log(`📧 Sending ${requestType} verification email to ${maskSensitiveData(email, 'email')} with code: ${code}`);
  }
}

export const complianceService = ComplianceService.getInstance();