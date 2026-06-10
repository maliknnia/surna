import { db } from "../db";
import { adminAuditLogs, type InsertAdminAuditLog } from "@shared/schema";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";

export class AuditService {
  static async log(params: {
    adminId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    reason?: string;
    before?: any;
    after?: any;
    ip?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    const auditEntry: InsertAdminAuditLog = {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      before: params.before ? this.redactSensitiveData(params.before) : null,
      after: params.after ? this.redactSensitiveData(params.after) : null,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: params.metadata,
    };

    await db.insert(adminAuditLogs).values(auditEntry);
  }

  private static redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const redacted = { ...data };
    
    const sensitiveFields = [
      'password',
      'passwordHash',
      'ssn',
      'creditCard',
      'cvv',
      'bankAccount',
      'apiKey',
      'secret',
      'token',
      'privateKey',
    ];

    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }

    if (redacted.email) {
      redacted.email = this.maskEmail(redacted.email);
    }
    
    if (redacted.phone) {
      redacted.phone = this.maskPhone(redacted.phone);
    }

    return redacted;
  }

  private static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '[MASKED]';
    
    const maskedLocal = local.length > 2
      ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
      : '**';
    
    return `${maskedLocal}@${domain}`;
  }

  private static maskPhone(phone: string): string {
    if (phone.length < 4) return '****';
    return `***-***-${phone.slice(-4)}`;
  }

  static async getAuditLogs(filters: {
    adminId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const conditions: SQL[] = [];
    if (filters.adminId) conditions.push(eq(adminAuditLogs.adminId, filters.adminId));
    if (filters.action) conditions.push(eq(adminAuditLogs.action, filters.action));
    if (filters.from) conditions.push(gte(adminAuditLogs.createdAt, filters.from));
    if (filters.to) conditions.push(lte(adminAuditLogs.createdAt, filters.to));

    const limit = filters.limit ?? 500;
    const offset = filters.offset ?? 0;

    if (conditions.length === 0) {
      return await db
        .select()
        .from(adminAuditLogs)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return await db
      .select()
      .from(adminAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
