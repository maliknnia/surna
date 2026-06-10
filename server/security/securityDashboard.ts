// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Request, Response } from 'express';
import { SecurityMonitoringService, SecurityThreatLevel } from './securityMonitoring';
import { BackupRecoveryService } from './backupRecovery';
import { GDPRComplianceService } from './gdprCompliance';
import { db } from '../db';
import { users, securityEvents } from '@shared/schema';
import { eq, gte, count, desc, sql } from 'drizzle-orm';

export interface SecurityMetrics {
  authentication: {
    totalUsers: number;
    mfaEnabledUsers: number;
    recentLogins: number;
    failedLogins: number;
    accountLockouts: number;
  };
  threats: {
    activeThreats: number;
    resolvedThreats: number;
    criticalThreats: number;
    suspiciousIPs: number;
  };
  compliance: {
    gdprRequests: number;
    pendingRequests: number;
    dataExports: number;
    consentRecords: number;
  };
  backup: {
    lastBackupDate?: Date;
    successfulBackups: number;
    failedBackups: number;
    totalBackupSize: number;
  };
  passwordSecurity: {
    weakPasswords: number;
    expiredPasswords: number;
    reusedPasswords: number;
    averageStrength: number;
  };
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: SecurityThreatLevel;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export class SecurityDashboardService {

  static async getSecurityMetrics(): Promise<SecurityMetrics> {
    const [
      authMetrics,
      threatMetrics,
      complianceMetrics,
      backupMetrics,
      passwordMetrics
    ] = await Promise.all([
      this.getAuthenticationMetrics(),
      this.getThreatMetrics(),
      this.getComplianceMetrics(),
      this.getBackupMetrics(),
      this.getPasswordMetrics()
    ]);

    return {
      authentication: authMetrics,
      threats: threatMetrics,
      compliance: complianceMetrics,
      backup: backupMetrics,
      passwordSecurity: passwordMetrics
    };
  }

  static async getSecurityAlerts(limit: number = 50): Promise<SecurityAlert[]> {
    try {
      const alerts = await db
        .select({
          id: securityEvents.id,
          eventType: securityEvents.eventType,
          threatLevel: securityEvents.threatLevel,
          description: securityEvents.description,
          createdAt: securityEvents.createdAt,
          resolved: securityEvents.resolved,
          metadata: securityEvents.metadata
        })
        .from(securityEvents)
        .orderBy(desc(securityEvents.createdAt))
        .limit(limit);

      return alerts.map(alert => ({
        id: alert.id,
        type: alert.eventType,
        severity: alert.threatLevel as SecurityThreatLevel,
        message: alert.description || '',
        timestamp: alert.createdAt || new Date(),
        resolved: alert.resolved || false,
        metadata: alert.metadata
      }));
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      return [];
    }
  }

  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      details?: any;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      details?: any;
    }> = [];

    try {
      await db.select({ count: count() }).from(users);
      checks.push({ name: 'Database Connectivity', status: 'pass' as const, message: 'Database is accessible' });
    } catch (error) {
      checks.push({ name: 'Database Connectivity', status: 'fail' as const, message: 'Database connection failed', details: error });
    }

    try {
      const backupStats = await BackupRecoveryService.getBackupStatistics();
      const lastBackupAge = backupStats.newestBackup
        ? Date.now() - backupStats.newestBackup.getTime() : Infinity;

      if (lastBackupAge < 24 * 60 * 60 * 1000) {
        checks.push({ name: 'Backup Status', status: 'pass' as const, message: 'Recent backup available' });
      } else if (lastBackupAge < 7 * 24 * 60 * 60 * 1000) {
        checks.push({ name: 'Backup Status', status: 'warn' as const, message: 'Backup older than 24 hours' });
      } else {
        checks.push({ name: 'Backup Status', status: 'fail' as const, message: 'No recent backups found' });
      }
    } catch {
      checks.push({ name: 'Backup Status', status: 'warn' as const, message: 'Could not retrieve backup status' });
    }

    try {
      const recentThreats = await db
        .select({ count: count() })
        .from(securityEvents)
        .where(sql`${securityEvents.createdAt} > NOW() - INTERVAL '1 hour' AND ${securityEvents.threatLevel} IN ('high', 'critical')`);

      const threatCount = Number(recentThreats[0]?.count || 0);
      if (threatCount === 0) {
        checks.push({ name: 'Security Threats', status: 'pass' as const, message: 'No recent high-severity threats' });
      } else if (threatCount < 5) {
        checks.push({ name: 'Security Threats', status: 'warn' as const, message: `${threatCount} high-severity threats in the last hour` });
      } else {
        checks.push({ name: 'Security Threats', status: 'fail' as const, message: `Multiple high-severity threats detected (${threatCount})` });
      }
    } catch {
      checks.push({ name: 'Security Threats', status: 'warn' as const, message: 'Could not retrieve threat data' });
    }

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;

    const status: 'healthy' | 'warning' | 'critical' =
      failedChecks > 0 ? 'critical' : warningChecks > 0 ? 'warning' : 'healthy';

    return { status, checks };
  }

  static async runSecurityAudit(): Promise<{
    score: number;
    issues: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      issue: string;
      recommendation: string;
    }>;
  }> {
    const issues: Array<{ category: string; severity: 'low' | 'medium' | 'high' | 'critical'; issue: string; recommendation: string }> = [];
    let score = 100;

    const passwordStats = await this.getPasswordMetrics();
    if (passwordStats.weakPasswords > 0) {
      issues.push({
        category: 'Password Security',
        severity: passwordStats.weakPasswords > 10 ? 'high' : 'medium',
        issue: `${passwordStats.weakPasswords} users have weak passwords`,
        recommendation: 'Enforce stronger password policies and notify affected users'
      });
      score -= passwordStats.weakPasswords > 10 ? 15 : 5;
    }

    const authStats = await this.getAuthenticationMetrics();
    if (authStats.totalUsers > 0) {
      const mfaAdoption = (authStats.mfaEnabledUsers / authStats.totalUsers) * 100;
      if (mfaAdoption < 80) {
        issues.push({
          category: 'Multi-Factor Authentication',
          severity: mfaAdoption < 50 ? 'high' : 'medium',
          issue: `Only ${mfaAdoption.toFixed(1)}% of users have MFA enabled`,
          recommendation: 'Encourage or require MFA adoption for all users'
        });
        score -= mfaAdoption < 50 ? 20 : 10;
      }
    }

    try {
      const unresolvedThreats = await db
        .select({ count: count() })
        .from(securityEvents)
        .where(eq(securityEvents.resolved, false));

      const unresolvedCount = Number(unresolvedThreats[0]?.count || 0);
      if (unresolvedCount > 0) {
        issues.push({
          category: 'Threat Management',
          severity: unresolvedCount > 5 ? 'critical' : 'medium',
          issue: `${unresolvedCount} unresolved security threats`,
          recommendation: 'Review and resolve all pending security threats'
        });
        score -= unresolvedCount > 5 ? 25 : 10;
      }
    } catch {
      // securityEvents table may not exist yet
    }

    try {
      const backupStats = await BackupRecoveryService.getBackupStatistics();
      const lastBackupAge = backupStats.newestBackup
        ? Date.now() - backupStats.newestBackup.getTime() : Infinity;

      if (lastBackupAge > 7 * 24 * 60 * 60 * 1000) {
        issues.push({
          category: 'Data Protection',
          severity: 'high',
          issue: 'No recent database backups found',
          recommendation: 'Ensure automated backups are running and create manual backup'
        });
        score -= 15;
      }
    } catch {
      // backup service may not be configured
    }

    return { score: Math.max(0, Math.min(100, score)), issues };
  }

  private static async getAuthenticationMetrics() {
    try {
      const [totalResult, mfaResult, loginResult, failedResult, lockoutResult] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(securityEvents)
          .where(sql`${securityEvents.eventType} = 'mfa_enabled' AND ${securityEvents.resolved} = false`),
        db.select({ count: count() }).from(securityEvents)
          .where(sql`${securityEvents.eventType} = 'login_attempt' AND ${securityEvents.createdAt} > NOW() - INTERVAL '24 hours'`),
        db.select({ count: count() }).from(securityEvents)
          .where(sql`${securityEvents.eventType} = 'login_failed' AND ${securityEvents.createdAt} > NOW() - INTERVAL '24 hours'`),
        db.select({ count: count() }).from(securityEvents)
          .where(sql`${securityEvents.eventType} = 'account_locked' AND ${securityEvents.createdAt} > NOW() - INTERVAL '7 days'`)
      ]);

      return {
        totalUsers: Number(totalResult[0]?.count || 0),
        mfaEnabledUsers: Number(mfaResult[0]?.count || 0),
        recentLogins: Number(loginResult[0]?.count || 0),
        failedLogins: Number(failedResult[0]?.count || 0),
        accountLockouts: Number(lockoutResult[0]?.count || 0)
      };
    } catch {
      const total = await db.select({ count: count() }).from(users);
      return {
        totalUsers: Number(total[0]?.count || 0),
        mfaEnabledUsers: 0,
        recentLogins: 0,
        failedLogins: 0,
        accountLockouts: 0
      };
    }
  }

  private static async getThreatMetrics() {
    try {
      const [active, resolved, critical, suspiciousIPsResult] = await Promise.all([
        db.select({ count: count() }).from(securityEvents).where(eq(securityEvents.resolved, false)),
        db.select({ count: count() }).from(securityEvents).where(eq(securityEvents.resolved, true)),
        db.select({ count: count() }).from(securityEvents)
          .where(sql`${securityEvents.threatLevel} = 'critical' AND ${securityEvents.resolved} = false`),
        db.execute(sql`
          SELECT COUNT(DISTINCT ip_address) AS cnt
          FROM security_events
          WHERE threat_level IN ('high', 'critical')
            AND ip_address IS NOT NULL
            AND created_at > NOW() - INTERVAL '24 hours'
        `)
      ]);

      return {
        activeThreats: Number(active[0]?.count || 0),
        resolvedThreats: Number(resolved[0]?.count || 0),
        criticalThreats: Number(critical[0]?.count || 0),
        suspiciousIPs: Number((suspiciousIPsResult.rows[0] as any)?.cnt || 0)
      };
    } catch {
      return { activeThreats: 0, resolvedThreats: 0, criticalThreats: 0, suspiciousIPs: 0 };
    }
  }

  private static async getComplianceMetrics() {
    try {
      const [counts, consentCount] = await Promise.all([
        GDPRComplianceService.countRequests(),
        GDPRComplianceService.countConsentRecords()
      ]);
      return {
        gdprRequests: counts.total,
        pendingRequests: counts.pending,
        dataExports: counts.exports,
        consentRecords: consentCount
      };
    } catch {
      return { gdprRequests: 0, pendingRequests: 0, dataExports: 0, consentRecords: 0 };
    }
  }

  private static async getBackupMetrics() {
    try {
      const stats = await BackupRecoveryService.getBackupStatistics();
      return {
        lastBackupDate: stats.newestBackup,
        successfulBackups: stats.successfulBackups,
        failedBackups: stats.failedBackups,
        totalBackupSize: stats.totalSize
      };
    } catch {
      return { lastBackupDate: undefined, successfulBackups: 0, failedBackups: 0, totalBackupSize: 0 };
    }
  }

  private static async getPasswordMetrics() {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE metadata->>'passwordStrength' = 'weak') AS weak_passwords,
          COUNT(*) FILTER (WHERE event_type = 'password_expired') AS expired_passwords,
          COUNT(*) FILTER (WHERE event_type = 'password_reused') AS reused_passwords,
          AVG(CASE WHEN metadata->>'passwordStrengthScore' IS NOT NULL
            THEN (metadata->>'passwordStrengthScore')::int ELSE 80 END) AS avg_strength
        FROM security_events
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);
      const row = result.rows[0] as any;
      return {
        weakPasswords: Number(row?.weak_passwords || 0),
        expiredPasswords: Number(row?.expired_passwords || 0),
        reusedPasswords: Number(row?.reused_passwords || 0),
        averageStrength: Math.round(Number(row?.avg_strength || 85))
      };
    } catch {
      return { weakPasswords: 0, expiredPasswords: 0, reusedPasswords: 0, averageStrength: 85 };
    }
  }
}

export const securityDashboardRoutes = {
  getMetrics: async (req: Request, res: Response) => {
    try {
      const metrics = await SecurityDashboardService.getSecurityMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      res.status(500).json({ error: 'Failed to fetch security metrics' });
    }
  },

  getAlerts: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await SecurityDashboardService.getSecurityAlerts(limit);
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      res.status(500).json({ error: 'Failed to fetch security alerts' });
    }
  },

  getSystemHealth: async (req: Request, res: Response) => {
    try {
      const health = await SecurityDashboardService.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error('Error checking system health:', error);
      res.status(500).json({ error: 'Failed to check system health' });
    }
  },

  runSecurityAudit: async (req: Request, res: Response) => {
    try {
      const audit = await SecurityDashboardService.runSecurityAudit();
      res.json(audit);
    } catch (error) {
      console.error('Error running security audit:', error);
      res.status(500).json({ error: 'Failed to run security audit' });
    }
  },

  testDisasterRecovery: async (req: Request, res: Response) => {
    try {
      const testResults = await BackupRecoveryService.testDisasterRecovery();
      res.json(testResults);
    } catch (error) {
      console.error('Error testing disaster recovery:', error);
      res.status(500).json({ error: 'Failed to test disaster recovery' });
    }
  }
};
