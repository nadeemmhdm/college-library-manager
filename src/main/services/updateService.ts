import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import { UpdateInfo } from '../../shared/types';
import { DatabaseService } from '../db/database';
import { BackupService } from './backupService';
import crypto from 'crypto';

export class UpdateService {
  private dbService: DatabaseService;
  private backupService: BackupService;
  private currentStatus: UpdateInfo;
  private mainWindow: BrowserWindow | null = null;
  private isTransactionActive = false;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.backupService = new BackupService();
    this.currentStatus = {
      currentVersion: app ? app.getVersion() : '1.0.0',
      updateAvailable: false,
      status: 'idle',
      lastChecked: undefined,
    };

    this.configureUpdater();
  }

  public setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win;
  }

  public setTransactionActive(active: boolean): void {
    this.isTransactionActive = active;
  }

  private configureUpdater(): void {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.currentStatus.status = 'checking';
      this.notifyWindow();
    });

    autoUpdater.on('update-available', (info) => {
      this.currentStatus = {
        currentVersion: app ? app.getVersion() : '1.0.0',
        latestVersion: info.version,
        updateAvailable: true,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : JSON.stringify(info.releaseNotes),
        status: 'available',
        lastChecked: new Date().toISOString(),
      };
      this.logUpdateActivity('UPDATE_AVAILABLE', `Version ${info.version} available on GitHub Releases`, 'success');
      this.notifyWindow();
    });

    autoUpdater.on('update-not-available', () => {
      this.currentStatus = {
        currentVersion: app ? app.getVersion() : '1.0.0',
        updateAvailable: false,
        status: 'not-available',
        lastChecked: new Date().toISOString(),
      };
      this.notifyWindow();
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.currentStatus.status = 'downloading';
      this.currentStatus.downloadProgress = Math.round(progressObj.percent);
      this.notifyWindow();
    });

    autoUpdater.on('update-downloaded', () => {
      this.currentStatus.status = 'downloaded';
      this.currentStatus.downloadProgress = 100;
      this.logUpdateActivity('UPDATE_DOWNLOADED', 'Update downloaded and verified. Ready to install.', 'success');
      this.notifyWindow();
    });

    autoUpdater.on('error', (err) => {
      this.currentStatus.status = 'error';
      this.currentStatus.errorMessage = err.message || 'Error checking for updates.';
      this.notifyWindow();
    });
  }

  public async checkForUpdates(): Promise<UpdateInfo> {
    try {
      this.currentStatus.status = 'checking';
      this.notifyWindow();

      // Check offline
      if (!navigator.onLine && typeof navigator !== 'undefined') {
        this.currentStatus.status = 'error';
        this.currentStatus.errorMessage = 'Offline: Please connect to the internet to check for updates.';
        return this.currentStatus;
      }

      await autoUpdater.checkForUpdates();
      return this.currentStatus;
    } catch (err: any) {
      this.currentStatus.status = 'error';
      this.currentStatus.errorMessage = err.message || 'Offline or GitHub update server unreachable.';
      this.notifyWindow();
      return this.currentStatus;
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (this.currentStatus.updateAvailable) {
      this.currentStatus.status = 'downloading';
      this.currentStatus.downloadProgress = 0;
      this.notifyWindow();
      await autoUpdater.downloadUpdate();
    }
  }

  public quitAndInstall(): { success: boolean; error?: string } {
    if (this.isTransactionActive) {
      return { success: false, error: 'Cannot install update while an active book issue or return transaction is in progress.' };
    }

    try {
      // Create guaranteed pre-update database backup
      this.backupService.createBackup('pre-update');
      this.logUpdateActivity('PRE_UPDATE_BACKUP', 'Automated pre-update snapshot created before software installation.', 'success');
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error executing update installation.' };
    }
  }

  public getStatus(): UpdateInfo {
    return this.currentStatus;
  }

  private notifyWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status-changed', this.currentStatus);
    }
  }

  private logUpdateActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.dbService.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'update', details, status]
      );
    } catch {}
  }
}
