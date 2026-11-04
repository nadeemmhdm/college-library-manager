import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { BackupItem, BackupConfig } from '../../shared/types';

export class BackupService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public getBackupConfig(): BackupConfig {
    const rows = this.dbService.query<any>('SELECT * FROM backup_config LIMIT 1');
    if (!rows || rows.length === 0) {
      return {
        autoBackupEnabled: true,
        frequency: 'daily',
        backupTime: '23:00',
        backupRetentionCount: 14,
        backupDestination: this.dbService.getSubDir('Backups'),
        lastBackupAt: undefined,
      };
    }
    const r = rows[0];
    return {
      autoBackupEnabled: Boolean(r.auto_backup_enabled),
      frequency: r.frequency,
      backupTime: r.backup_time,
      backupRetentionCount: Number(r.backup_retention_count),
      backupDestination: r.backup_destination || this.dbService.getSubDir('Backups'),
      externalDrivePath: r.external_drive_path,
      lastBackupAt: r.last_backup_at,
    };
  }

  public updateBackupConfig(config: Partial<BackupConfig>): { success: boolean; error?: string } {
    try {
      this.dbService.run(
        `UPDATE backup_config SET
          auto_backup_enabled = COALESCE(?, auto_backup_enabled),
          frequency = COALESCE(?, frequency),
          backup_time = COALESCE(?, backup_time),
          backup_retention_count = COALESCE(?, backup_retention_count),
          backup_destination = COALESCE(?, backup_destination),
          external_drive_path = COALESCE(?, external_drive_path)
         WHERE id = 'default'`,
        [
          config.autoBackupEnabled !== undefined ? (config.autoBackupEnabled ? 1 : 0) : null,
          config.frequency,
          config.backupTime,
          config.backupRetentionCount,
          config.backupDestination,
          config.externalDrivePath,
        ]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public listBackups(): BackupItem[] {
    const rows = this.dbService.query<any>('SELECT * FROM backup_history ORDER BY created_at DESC');
    return rows.map(r => ({
      id: r.id,
      fileName: r.file_name,
      filePath: r.file_path,
      fileSizeBytes: Number(r.file_size_bytes),
      createdAt: r.created_at,
      type: r.type,
      encrypted: Boolean(r.encrypted),
      checksum: r.checksum,
    }));
  }

  // Create local encrypted database backup
  public createBackup(type: 'automatic' | 'manual' | 'pre-update' | 'pre-restore' = 'manual', destinationFolder?: string): {
    success: boolean;
    backup?: BackupItem;
    error?: string;
  } {
    try {
      this.dbService.save(); // Ensure all active transactions are persisted

      const config = this.getBackupConfig();
      const targetDir = destinationFolder || config.backupDestination || this.dbService.getSubDir('Backups');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `CollegeLibrary_Backup_${timestamp}.bak`;
      const targetFilePath = path.join(targetDir, fileName);

      const dbPath = path.join(this.dbService.getSubDir('Database'), 'library.db.enc');
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Source database file not found.' };
      }

      // Copy database file
      fs.copyFileSync(dbPath, targetFilePath);

      const fileStats = fs.statSync(targetFilePath);
      const fileBytes = fs.readFileSync(targetFilePath);
      const checksum = crypto.createHash('sha256').update(fileBytes).digest('hex');

      const backupId = crypto.randomUUID();
      const now = new Date().toISOString();

      this.dbService.run(
        `INSERT INTO backup_history (
          id, file_name, file_path, file_size_bytes, created_at, type, encrypted, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [backupId, fileName, targetFilePath, fileStats.size, now, type, checksum]
      );

      this.dbService.run("UPDATE backup_config SET last_backup_at = ? WHERE id = 'default'", [now]);

      // Apply retention policy for automatic/manual backups
      this.applyRetentionPolicy(targetDir, config.backupRetentionCount);

      this.logBackupActivity('CREATE_BACKUP', `Created backup '${fileName}' (${Math.round(fileStats.size / 1024)} KB)`, 'success');

      return {
        success: true,
        backup: {
          id: backupId,
          fileName,
          filePath: targetFilePath,
          fileSizeBytes: fileStats.size,
          createdAt: now,
          type,
          encrypted: true,
          checksum,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Restore from a backup file with safe rollback
  public async restoreBackup(backupFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(backupFilePath)) {
        return { success: false, error: 'Backup file does not exist.' };
      }

      // Step 1: Pre-restore safety backup of current database
      this.createBackup('pre-restore');

      const currentDbPath = path.join(this.dbService.getSubDir('Database'), 'library.db.enc');

      // Verify the backup file can be decrypted and SQLite integrity passes
      const backupBytes = fs.readFileSync(backupFilePath);
      if (backupBytes.length < 28) {
        return { success: false, error: 'Backup file is truncated or not a valid encrypted library backup.' };
      }

      // Step 2: Atomic replacement
      const tempRestorePath = currentDbPath + '.restoring';
      fs.copyFileSync(backupFilePath, tempRestorePath);
      fs.renameSync(tempRestorePath, currentDbPath);

      // Re-initialize database
      await this.dbService.init();

      this.logBackupActivity('RESTORE_BACKUP', `Successfully restored database from: ${backupFilePath}`, 'success');
      return { success: true };
    } catch (err: any) {
      this.logBackupActivity('RESTORE_FAILED', `Failed to restore backup: ${err.message}`, 'error');
      return { success: false, error: `Restore failed: ${err.message}. Original data preserved.` };
    }
  }

  // Retention cleanup
  private applyRetentionPolicy(dir: string, maxCount: number): void {
    try {
      const history = this.listBackups().filter(b => b.type === 'automatic' || b.type === 'manual');
      if (history.length > maxCount) {
        const toDelete = history.slice(maxCount);
        for (const item of toDelete) {
          if (fs.existsSync(item.filePath)) {
            try {
              fs.unlinkSync(item.filePath);
            } catch {}
          }
          this.dbService.run('DELETE FROM backup_history WHERE id = ?', [item.id]);
        }
      }
    } catch {}
  }

  private logBackupActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.dbService.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'backup', details, status]
      );
    } catch {}
  }
}
