// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from '../db';
import { users, posts, postComments, teamMembers, messages } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { logSecurityEvent } from './auditLogging';
import { AuditEventType, AuditSeverity } from './auditLogging';
import { DataEncryption } from './dataEncryption';

export enum GDPRRequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification', 
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICT = 'restrict',
  OBJECT = 'object'
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export interface GDPRRequest {
  id: string;
  userId: string;
  requestType: GDPRRequestType;
  status: RequestStatus;
  requestData?: any;
  responseData?: any;
  requestDate: Date;
  completionDate?: Date;
  expiryDate: Date;
  adminNotes?: string;
  userIdentity?: {
    email: string;
    fullName: string;
    verificationMethod: string;
    verifiedAt: Date;
  };
}

export interface DataExportPackage {
  userId: string;
  generatedAt: Date;
  format: 'json' | 'csv';
  data: {
    profile: any;
    posts: any[];
    comments: any[];
    teams: any[];
    messages: any[];
    activities: any[];
  };
  metadata: {
    totalRecords: number;
    dataCategories: string[];
    legalBasis: string[];
  };
}

async function ensureGDPRTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gdpr_requests (
      id VARCHAR PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id),
      request_type VARCHAR NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      request_data JSONB,
      response_data JSONB,
      request_date TIMESTAMP NOT NULL DEFAULT NOW(),
      completion_date TIMESTAMP,
      expiry_date TIMESTAMP NOT NULL,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS consent_records (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id),
      consent_type VARCHAR NOT NULL,
      granted BOOLEAN NOT NULL,
      ip_address VARCHAR,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON gdpr_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
    CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id);
  `);
}

let tablesReady = false;
async function ensureReady() {
  if (!tablesReady) {
    await ensureGDPRTables();
    tablesReady = true;
  }
}

function rowToGDPRRequest(row: any): GDPRRequest {
  return {
    id: row.id,
    userId: row.user_id,
    requestType: row.request_type as GDPRRequestType,
    status: row.status as RequestStatus,
    requestData: row.request_data,
    responseData: row.response_data,
    requestDate: new Date(row.request_date),
    completionDate: row.completion_date ? new Date(row.completion_date) : undefined,
    expiryDate: new Date(row.expiry_date),
    adminNotes: row.admin_notes,
  };
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function jsonToCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ];
  return lines.join('\n');
}

export class GDPRComplianceService {
  private static readonly REQUEST_EXPIRY_DAYS = 30;
  private static readonly EXPORT_RETENTION_DAYS = 30;

  static async submitGDPRRequest(
    userId: string,
    requestType: GDPRRequestType,
    requestData?: any
  ): Promise<GDPRRequest> {
    await ensureReady();
    const requestId = `GDPR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.REQUEST_EXPIRY_DAYS);

    const gdprRequest: GDPRRequest = {
      id: requestId,
      userId,
      requestType,
      status: RequestStatus.PENDING,
      requestData,
      requestDate: new Date(),
      expiryDate
    };

    await this.storeGDPRRequest(gdprRequest);

    await logSecurityEvent({
      eventType: AuditEventType.GDPR_REQUEST_SUBMITTED,
      severity: AuditSeverity.MEDIUM,
      userId,
      details: { requestId, requestType, expiryDate },
      timestamp: new Date()
    });

    if (requestType === GDPRRequestType.ACCESS || requestType === GDPRRequestType.PORTABILITY) {
      setTimeout(() => this.processGDPRRequest(requestId), 1000);
    }

    return gdprRequest;
  }

  static async processGDPRRequest(requestId: string): Promise<void> {
    const request = await this.getGDPRRequest(requestId);
    if (!request || request.status !== RequestStatus.PENDING) return;

    try {
      await this.updateGDPRRequest(requestId, { status: RequestStatus.IN_PROGRESS });

      switch (request.requestType) {
        case GDPRRequestType.ACCESS:
          await this.processAccessRequest(request);
          break;
        case GDPRRequestType.PORTABILITY:
          await this.processPortabilityRequest(request);
          break;
        case GDPRRequestType.ERASURE:
          await this.processErasureRequest(request);
          break;
        case GDPRRequestType.RECTIFICATION:
          await this.processRectificationRequest(request);
          break;
        case GDPRRequestType.RESTRICT:
          await this.processRestrictionRequest(request);
          break;
        default:
          throw new Error(`Unsupported request type: ${request.requestType}`);
      }

      await this.updateGDPRRequest(requestId, {
        status: RequestStatus.COMPLETED,
        completionDate: new Date()
      });

    } catch (error) {
      await this.updateGDPRRequest(requestId, {
        status: RequestStatus.REJECTED,
        adminNotes: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  private static async processAccessRequest(request: GDPRRequest): Promise<void> {
    const dataPackage = await this.generateDataExport(request.userId, 'json');
    await this.updateGDPRRequest(request.id, {
      responseData: {
        message: 'Your personal data export has been generated',
        downloadUrl: `/api/gdpr/export/${dataPackage.userId}`,
        expiresAt: new Date(Date.now() + this.EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000),
        dataCategories: dataPackage.metadata.dataCategories,
        totalRecords: dataPackage.metadata.totalRecords
      }
    });
  }

  private static async processPortabilityRequest(request: GDPRRequest): Promise<void> {
    const format = request.requestData?.format || 'json';
    const dataPackage = await this.generateDataExport(request.userId, format);
    await this.updateGDPRRequest(request.id, {
      responseData: {
        message: 'Your data export in machine-readable format has been generated',
        downloadUrl: `/api/gdpr/export/${dataPackage.userId}`,
        format: dataPackage.format,
        expiresAt: new Date(Date.now() + this.EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
      }
    });
  }

  private static async processErasureRequest(request: GDPRRequest): Promise<void> {
    const canErase = await this.checkErasureLegality(request.userId);
    if (!canErase.allowed) {
      throw new Error(`Data erasure not permitted: ${canErase.reason}`);
    }

    await this.anonymizeUserData(request.userId);

    await this.updateGDPRRequest(request.id, {
      responseData: {
        message: 'Your personal data has been erased from our systems',
        erasedAt: new Date(),
        retainedData: canErase.retainedCategories || [],
        retentionReason: canErase.retentionReason
      }
    });

    await logSecurityEvent({
      eventType: AuditEventType.USER_DATA_DELETED,
      severity: AuditSeverity.HIGH,
      userId: request.userId,
      details: {
        requestId: request.id,
        method: 'gdpr_erasure',
        retainedData: canErase.retainedCategories
      },
      timestamp: new Date()
    });
  }

  private static async processRectificationRequest(request: GDPRRequest): Promise<void> {
    console.log(`[GDPR] Rectification request ${request.id} queued for admin review`);
  }

  private static async processRestrictionRequest(request: GDPRRequest): Promise<void> {
    console.log(`[GDPR] Restriction request ${request.id} queued for admin review`);
  }

  static async generateDataExport(userId: string, format: 'json' | 'csv' = 'json'): Promise<DataExportPackage> {
    const dataEncryption = DataEncryption.getInstance();

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const userPosts = await db.select().from(posts).where(eq(posts.authorId, userId));
    const userComments = await db.select().from(postComments).where(eq(postComments.authorId, userId));
    const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const userMessages = await db.select().from(messages).where(eq(messages.senderId, userId));

    const decryptedUser = { ...user };
    if (user?.email && user.email.includes(':')) {
      try {
        const [encrypted, iv, tag] = user.email.split(':');
        decryptedUser.email = dataEncryption.decryptPII({ encrypted, iv, tag }, 'email');
      } catch {
        // keep original if decryption fails
      }
    }

    const exportData: DataExportPackage = {
      userId,
      generatedAt: new Date(),
      format,
      data: {
        profile: decryptedUser,
        posts: userPosts,
        comments: userComments,
        teams: userTeams,
        messages: userMessages.map(m => ({ id: m.id, content: m.content, sentAt: m.sentAt })),
        activities: []
      },
      metadata: {
        totalRecords: userPosts.length + userComments.length + userTeams.length + userMessages.length + 1,
        dataCategories: ['profile', 'posts', 'comments', 'teams', 'messages'],
        legalBasis: ['consent', 'contract', 'legitimate_interest']
      }
    };

    await this.storeDataExport(exportData);

    await logSecurityEvent({
      eventType: AuditEventType.USER_DATA_EXPORTED,
      severity: AuditSeverity.MEDIUM,
      userId,
      details: {
        format,
        totalRecords: exportData.metadata.totalRecords,
        categories: exportData.metadata.dataCategories
      },
      timestamp: new Date()
    });

    return exportData;
  }

  private static async checkErasureLegality(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    retainedCategories?: string[];
    retentionReason?: string;
  }> {
    return {
      allowed: true,
      retainedCategories: ['audit_logs', 'financial_records'],
      retentionReason: 'Legal and regulatory compliance requirements'
    };
  }

  private static async anonymizeUserData(userId: string): Promise<void> {
    const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.update(users)
      .set({
        id: anonymousId,
        email: null,
        firstName: 'Anonymous',
        lastName: 'User',
        profileImageUrl: null,
        bio: null,
        location: null,
        dateOfBirth: null
      })
      .where(eq(users.id, userId));

    await db.update(posts)
      .set({ authorId: anonymousId })
      .where(eq(posts.authorId, userId));

    await db.update(postComments)
      .set({ authorId: anonymousId })
      .where(eq(postComments.authorId, userId));

    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
  }

  static async recordConsent(userId: string, consentType: string, granted: boolean, ipAddress?: string, userAgent?: string): Promise<void> {
    await ensureReady();
    await this.storeConsentRecord({ userId, consentType, granted, ipAddress, userAgent });

    await logSecurityEvent({
      eventType: granted ? AuditEventType.PARENTAL_CONSENT_GRANTED : AuditEventType.PARENTAL_CONSENT_REVOKED,
      severity: AuditSeverity.MEDIUM,
      userId,
      details: { consentType, granted },
      timestamp: new Date()
    });
  }

  static async applyRetentionPolicy(): Promise<void> {
    const policies = await this.getRetentionPolicies();

    for (const policy of policies) {
      try {
        await this.enforceRetentionPolicy(policy);
        await logSecurityEvent({
          eventType: AuditEventType.DATA_RETENTION_POLICY_APPLIED,
          severity: AuditSeverity.MEDIUM,
          details: {
            policyId: policy.id,
            dataType: policy.dataType,
            retentionPeriod: policy.retentionDays
          },
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Failed to apply retention policy ${policy.id}:`, error);
      }
    }
  }

  static async getRequestsByUser(userId: string): Promise<GDPRRequest[]> {
    await ensureReady();
    const result = await db.execute(sql`
      SELECT * FROM gdpr_requests WHERE user_id = ${userId} ORDER BY request_date DESC
    `);
    return (result.rows as any[]).map(rowToGDPRRequest);
  }

  static async countRequests(): Promise<{ total: number; pending: number; completed: number; exports: number }> {
    await ensureReady();
    const result = await db.execute(sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE request_type IN ('access', 'portability')) AS exports
      FROM gdpr_requests
    `);
    const row = result.rows[0] as any;
    return {
      total: Number(row?.total || 0),
      pending: Number(row?.pending || 0),
      completed: Number(row?.completed || 0),
      exports: Number(row?.exports || 0)
    };
  }

  static async countConsentRecords(): Promise<number> {
    await ensureReady();
    const result = await db.execute(sql`SELECT COUNT(*) AS cnt FROM consent_records`);
    return Number((result.rows[0] as any)?.cnt || 0);
  }

  private static async storeGDPRRequest(request: GDPRRequest): Promise<void> {
    await ensureReady();
    await db.execute(sql`
      INSERT INTO gdpr_requests (id, user_id, request_type, status, request_data, request_date, expiry_date)
      VALUES (
        ${request.id},
        ${request.userId},
        ${request.requestType},
        ${request.status},
        ${request.requestData ? JSON.stringify(request.requestData) : null}::jsonb,
        ${request.requestDate.toISOString()},
        ${request.expiryDate.toISOString()}
      )
    `);
  }

  private static async getGDPRRequest(requestId: string): Promise<GDPRRequest | null> {
    await ensureReady();
    const result = await db.execute(sql`
      SELECT * FROM gdpr_requests WHERE id = ${requestId} LIMIT 1
    `);
    const row = result.rows[0] as any;
    return row ? rowToGDPRRequest(row) : null;
  }

  private static async updateGDPRRequest(requestId: string, updates: Partial<GDPRRequest>): Promise<void> {
    await ensureReady();
    if (updates.status !== undefined) {
      await db.execute(sql`UPDATE gdpr_requests SET status = ${updates.status}, updated_at = NOW() WHERE id = ${requestId}`);
    }
    if (updates.responseData !== undefined) {
      await db.execute(sql`UPDATE gdpr_requests SET response_data = ${JSON.stringify(updates.responseData)}::jsonb, updated_at = NOW() WHERE id = ${requestId}`);
    }
    if (updates.completionDate !== undefined) {
      await db.execute(sql`UPDATE gdpr_requests SET completion_date = ${updates.completionDate?.toISOString()}, updated_at = NOW() WHERE id = ${requestId}`);
    }
    if (updates.adminNotes !== undefined) {
      await db.execute(sql`UPDATE gdpr_requests SET admin_notes = ${updates.adminNotes}, updated_at = NOW() WHERE id = ${requestId}`);
    }
  }

  private static async storeDataExport(exportData: DataExportPackage): Promise<void> {
    const content = exportData.format === 'csv'
      ? Object.entries(exportData.data).map(([section, rows]) => {
          if (!Array.isArray(rows) || rows.length === 0) return `## ${section}\n(no records)`;
          return `## ${section}\n${jsonToCSV(rows)}`;
        }).join('\n\n')
      : JSON.stringify(exportData, null, 2);

    await db.execute(sql`
      INSERT INTO gdpr_requests (id, user_id, request_type, status, response_data, request_date, expiry_date)
      VALUES (
        ${'EXPORT_' + exportData.userId + '_' + Date.now()},
        ${exportData.userId},
        'export_cache',
        'completed',
        ${JSON.stringify({ content, generatedAt: exportData.generatedAt, format: exportData.format })}::jsonb,
        NOW(),
        ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
      )
      ON CONFLICT DO NOTHING
    `);
  }

  private static async storeConsentRecord(consent: {
    userId: string;
    consentType: string;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await db.execute(sql`
      INSERT INTO consent_records (user_id, consent_type, granted, ip_address, user_agent)
      VALUES (
        ${consent.userId},
        ${consent.consentType},
        ${consent.granted},
        ${consent.ipAddress || null},
        ${consent.userAgent || null}
      )
    `);
  }

  private static async getRetentionPolicies(): Promise<Array<{
    id: string;
    dataType: string;
    retentionDays: number;
  }>> {
    return [
      { id: 'posts', dataType: 'posts', retentionDays: 2555 },
      { id: 'audit_logs', dataType: 'audit_logs', retentionDays: 2555 },
      { id: 'user_sessions', dataType: 'user_sessions', retentionDays: 90 }
    ];
  }

  private static async enforceRetentionPolicy(policy: { id: string; dataType: string; retentionDays: number }): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    const cutoff = cutoffDate.toISOString();

    if (policy.dataType === 'user_sessions') {
      await db.execute(sql`
        DELETE FROM sessions WHERE expire < ${cutoff}::timestamp
      `);
      console.log(`[GDPR] Cleaned up sessions older than ${cutoffDate.toDateString()}`);
    } else {
      console.log(`[GDPR] Retention check for ${policy.dataType} (cutoff: ${cutoffDate.toDateString()}) — no auto-delete configured`);
    }
  }
}

export class CCPAComplianceService extends GDPRComplianceService {
  static async submitCCPARequest(
    userId: string,
    requestType: 'know' | 'delete' | 'opt-out',
    requestData?: any
  ): Promise<GDPRRequest> {
    const gdprType = requestType === 'know' ? GDPRRequestType.ACCESS :
                    requestType === 'delete' ? GDPRRequestType.ERASURE :
                    GDPRRequestType.OBJECT;
    return this.submitGDPRRequest(userId, gdprType, { ...requestData, ccpa: true });
  }

  static async getCCPADataCategories(_userId: string): Promise<{
    categories: Array<{
      category: string;
      description: string;
      sources: string[];
      purposes: string[];
      sold: boolean;
      disclosed: boolean;
    }>;
  }> {
    return {
      categories: [
        {
          category: 'Identifiers',
          description: 'Real name, email address, account name',
          sources: ['User registration', 'Profile updates'],
          purposes: ['Account management', 'Communication'],
          sold: false,
          disclosed: false
        },
        {
          category: 'Commercial Information',
          description: 'Purchase history and preferences',
          sources: ['E-commerce transactions'],
          purposes: ['Order fulfillment', 'Recommendations'],
          sold: false,
          disclosed: true
        },
        {
          category: 'Internet Activity',
          description: 'Browsing history, app usage',
          sources: ['Website analytics', 'App usage'],
          purposes: ['Service improvement', 'Analytics'],
          sold: false,
          disclosed: true
        }
      ]
    };
  }
}
