// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { createGzip, createGunzip } from 'zlib';
import { logSecurityEvent } from './auditLogging';
import { AuditEventType, AuditSeverity } from './auditLogging';

const execAsync = promisify(exec);

export interface BackupConfig {
  type: 'full' | 'incremental';
  compression: boolean;
  encryption: boolean;
  retentionDays: number;
  s3Bucket?: string;
  localPath: string;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'full' | 'incremental';
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  location: string;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

export interface RestoreOptions {
  backupId: string;
  pointInTime?: Date;
  verifyIntegrity: boolean;
  dryRun?: boolean;
}

export class BackupRecoveryService {
  private static readonly DEFAULT_BACKUP_PATH = './backups';
  private static readonly DEFAULT_CONFIG: BackupConfig = {
    type: 'full',
    compression: true,
    encryption: false, // Enable with proper key management in production
    retentionDays: 30,
    localPath: './backups'
  };

  static async createDatabaseBackup(
    config: Partial<BackupConfig> = {}
  ): Promise<BackupMetadata> {
    const backupConfig = { ...this.DEFAULT_CONFIG, ...config };
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory(backupConfig.localPath);

      const dumpFile = path.join(backupConfig.localPath, `${backupId}.sql`);
      const finalFile = backupConfig.compression ? `${dumpFile}.gz` : dumpFile;

      // Create database dump
      const pgDumpCommand = this.buildPgDumpCommand(dumpFile, backupConfig);
      console.log('Starting database backup...');
      
      await execAsync(pgDumpCommand);

      // Compress if requested
      if (backupConfig.compression) {
        await this.compressFile(dumpFile, `${dumpFile}.gz`);
        // Remove uncompressed file
        fs.unlinkSync(dumpFile);
      }

      // Get file stats
      const stats = fs.statSync(finalFile);
      const checksum = await this.calculateChecksum(finalFile);

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: backupConfig.type,
        size: stats.size,
        compressed: backupConfig.compression,
        encrypted: backupConfig.encryption,
        checksum,
        location: finalFile,
        status: 'completed'
      };

      // Store metadata
      await this.storeBackupMetadata(metadata);

      // Log backup event
      await logSecurityEvent({
        eventType: AuditEventType.DATA_BACKUP_CREATED,
        severity: AuditSeverity.MEDIUM,
        details: {
          backupId,
          size: stats.size,
          type: backupConfig.type,
          compressed: backupConfig.compression
        },
        timestamp
      });

      // Clean old backups based on retention policy
      await this.cleanOldBackups(backupConfig);

      console.log(`Database backup completed: ${backupId}`);
      return metadata;

    } catch (error) {
      const errorMetadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: backupConfig.type,
        size: 0,
        compressed: backupConfig.compression,
        encrypted: backupConfig.encryption,
        checksum: '',
        location: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.storeBackupMetadata(errorMetadata);
      
      await logSecurityEvent({
        eventType: AuditEventType.DATA_BACKUP_FAILED,
        severity: AuditSeverity.HIGH,
        details: { backupId, error: errorMetadata.error },
        timestamp
      });

      throw new Error(`Database backup failed: ${error}`);
    }
  }

  static async restoreDatabase(options: RestoreOptions): Promise<void> {
    try {
      const metadata = await this.getBackupMetadata(options.backupId);
      if (!metadata) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      if (metadata.status !== 'completed') {
        throw new Error(`Backup is not in completed state: ${metadata.status}`);
      }

      // Verify backup integrity
      if (options.verifyIntegrity) {
        const isValid = await this.verifyBackupIntegrity(metadata);
        if (!isValid) {
          throw new Error('Backup integrity verification failed');
        }
      }

      if (options.dryRun) {
        console.log('Dry run: Would restore from backup', options.backupId);
        return;
      }

      console.log(`Starting database restore from backup: ${options.backupId}`);

      // Prepare restore file
      let restoreFile = metadata.location;
      if (metadata.compressed) {
        const decompressedFile = restoreFile.replace('.gz', '');
        await this.decompressFile(restoreFile, decompressedFile);
        restoreFile = decompressedFile;
      }

      // Execute restore
      const restoreCommand = this.buildPgRestoreCommand(restoreFile);
      await execAsync(restoreCommand);

      // Clean up temporary files
      if (metadata.compressed) {
        fs.unlinkSync(restoreFile); // Remove decompressed temp file
      }

      await logSecurityEvent({
        eventType: AuditEventType.DATA_RESTORE_COMPLETED,
        severity: AuditSeverity.HIGH,
        details: { backupId: options.backupId, pointInTime: options.pointInTime },
        timestamp: new Date()
      });

      console.log(`Database restore completed from backup: ${options.backupId}`);

    } catch (error) {
      await logSecurityEvent({
        eventType: AuditEventType.DATA_RESTORE_FAILED,
        severity: AuditSeverity.CRITICAL,
        details: { backupId: options.backupId, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      });

      throw new Error(`Database restore failed: ${error}`);
    }
  }

  private static buildPgDumpCommand(outputFile: string, config: BackupConfig): string {
    const { DATABASE_URL, PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
    
    if (DATABASE_URL) {
      return `pg_dump "${DATABASE_URL}" --verbose --no-password --clean --if-exists > "${outputFile}"`;
    } else {
      const host = PGHOST || 'localhost';
      const port = PGPORT || '5432';
      const database = PGDATABASE || 'surna';
      const user = PGUSER || 'postgres';
      
      return `PGPASSWORD="${PGPASSWORD}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} --verbose --no-password --clean --if-exists > "${outputFile}"`;
    }
  }

  private static buildPgRestoreCommand(inputFile: string): string {
    const { DATABASE_URL, PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
    
    if (DATABASE_URL) {
      return `psql "${DATABASE_URL}" --quiet < "${inputFile}"`;
    } else {
      const host = PGHOST || 'localhost';
      const port = PGPORT || '5432';
      const database = PGDATABASE || 'surna';
      const user = PGUSER || 'postgres';
      
      return `PGPASSWORD="${PGPASSWORD}" psql -h ${host} -p ${port} -U ${user} -d ${database} --quiet < "${inputFile}"`;
    }
  }

  private static async ensureBackupDirectory(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }
  }

  private static async compressFile(inputFile: string, outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFile);
      const writeStream = createWriteStream(outputFile);
      const gzip = createGzip({ level: 9 });

      pipeline(readStream, gzip, writeStream, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private static async decompressFile(inputFile: string, outputFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputFile);
      const writeStream = createWriteStream(outputFile);
      const gunzip = createGunzip();

      pipeline(readStream, gunzip, writeStream, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private static async calculateChecksum(filePath: string): Promise<string> {
    const crypto = await import('crypto');
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private static async verifyBackupIntegrity(metadata: BackupMetadata): Promise<boolean> {
    try {
      // Check if file exists
      if (!fs.existsSync(metadata.location)) {
        console.error('Backup file not found:', metadata.location);
        return false;
      }

      // Verify file size
      const stats = fs.statSync(metadata.location);
      if (stats.size !== metadata.size) {
        console.error('Backup file size mismatch');
        return false;
      }

      // Verify checksum
      const currentChecksum = await this.calculateChecksum(metadata.location);
      if (currentChecksum !== metadata.checksum) {
        console.error('Backup file checksum mismatch');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Backup integrity verification failed:', error);
      return false;
    }
  }

  private static async storeBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataPath = path.join(
      path.dirname(metadata.location || this.DEFAULT_BACKUP_PATH),
      `${metadata.id}.metadata.json`
    );
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private static async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    try {
      const metadataPath = path.join(this.DEFAULT_BACKUP_PATH, `${backupId}.metadata.json`);
      if (!fs.existsSync(metadataPath)) {
        return null;
      }
      const data = fs.readFileSync(metadataPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private static async cleanOldBackups(config: BackupConfig): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      const backupDir = config.localPath;
      const files = fs.readdirSync(backupDir);

      for (const file of files) {
        if (file.endsWith('.metadata.json')) {
          const metadataPath = path.join(backupDir, file);
          const metadata: BackupMetadata = JSON.parse(
            fs.readFileSync(metadataPath, 'utf8')
          );

          if (new Date(metadata.timestamp) < cutoffDate) {
            // Remove backup file and metadata
            if (fs.existsSync(metadata.location)) {
              fs.unlinkSync(metadata.location);
            }
            fs.unlinkSync(metadataPath);
            
            console.log(`Cleaned up old backup: ${metadata.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  // Disaster Recovery Testing
  static async testDisasterRecovery(): Promise<{
    success: boolean;
    testResults: Array<{
      test: string;
      passed: boolean;
      details?: string;
    }>;
  }> {
    const testResults: Array<{ test: string; passed: boolean; details?: string }> = [];

    try {
      // Test 1: Create a test backup
      console.log('Testing backup creation...');
      const backup = await this.createDatabaseBackup({
        type: 'full',
        compression: true,
        localPath: './test-backups'
      });
      testResults.push({
        test: 'Backup Creation',
        passed: backup.status === 'completed',
        details: backup.status === 'completed' ? `Created backup ${backup.id}` : backup.error
      });

      // Test 2: Verify backup integrity
      console.log('Testing backup integrity...');
      const integrityValid = await this.verifyBackupIntegrity(backup);
      testResults.push({
        test: 'Backup Integrity Verification',
        passed: integrityValid,
        details: integrityValid ? 'Backup integrity verified' : 'Integrity check failed'
      });

      // Test 3: Test restore (dry run)
      console.log('Testing restore process (dry run)...');
      try {
        await this.restoreDatabase({
          backupId: backup.id,
          verifyIntegrity: true,
          dryRun: true
        });
        testResults.push({
          test: 'Restore Process (Dry Run)',
          passed: true,
          details: 'Dry run restore completed successfully'
        });
      } catch (error) {
        testResults.push({
          test: 'Restore Process (Dry Run)',
          passed: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Clean up test backup
      if (fs.existsSync(backup.location)) {
        fs.unlinkSync(backup.location);
      }

      const allPassed = testResults.every(result => result.passed);
      
      await logSecurityEvent({
        eventType: AuditEventType.DISASTER_RECOVERY_TEST,
        severity: allPassed ? AuditSeverity.LOW : AuditSeverity.HIGH,
        details: { testResults, success: allPassed },
        timestamp: new Date()
      });

      return {
        success: allPassed,
        testResults
      };

    } catch (error) {
      const errorResult = {
        test: 'Disaster Recovery Test Suite',
        passed: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      };
      testResults.push(errorResult);

      return {
        success: false,
        testResults
      };
    }
  }

  // Get backup statistics
  static async getBackupStatistics(): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    try {
      const backupDir = this.DEFAULT_BACKUP_PATH;
      if (!fs.existsSync(backupDir)) {
        return {
          totalBackups: 0,
          successfulBackups: 0,
          failedBackups: 0,
          totalSize: 0
        };
      }

      const files = fs.readdirSync(backupDir);
      const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));

      let successfulBackups = 0;
      let failedBackups = 0;
      let totalSize = 0;
      let oldestBackup: Date | undefined;
      let newestBackup: Date | undefined;

      for (const file of metadataFiles) {
        const metadataPath = path.join(backupDir, file);
        const metadata: BackupMetadata = JSON.parse(
          fs.readFileSync(metadataPath, 'utf8')
        );

        const backupDate = new Date(metadata.timestamp);

        if (metadata.status === 'completed') {
          successfulBackups++;
          totalSize += metadata.size;
        } else {
          failedBackups++;
        }

        if (!oldestBackup || backupDate < oldestBackup) {
          oldestBackup = backupDate;
        }
        if (!newestBackup || backupDate > newestBackup) {
          newestBackup = backupDate;
        }
      }

      return {
        totalBackups: metadataFiles.length,
        successfulBackups,
        failedBackups,
        totalSize,
        oldestBackup,
        newestBackup
      };
    } catch (error) {
      console.error('Failed to get backup statistics:', error);
      return {
        totalBackups: 0,
        successfulBackups: 0,
        failedBackups: 0,
        totalSize: 0
      };
    }
  }
}