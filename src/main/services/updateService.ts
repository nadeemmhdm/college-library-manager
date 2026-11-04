import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import https from 'https';
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
      this.currentStatus.errorMessage = undefined;
      this.notifyWindow();

      // Check GitHub releases via official API
      const checkResult = await new Promise<any>((resolve, reject) => {
        const req = https.get(
          'https://api.github.com/repos/nadeemmhdm/college-library-manager/releases/latest',
          {
            headers: {
              'User-Agent': 'CollegeLibraryManager-Desktop',
              Accept: 'application/vnd.github.v3+json',
            },
            timeout: 8000,
          },
          res => {
            if (res.statusCode === 404) {
              resolve({ hasUpdate: false });
              return;
            }
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                resolve(json);
              } catch (e) {
                reject(e);
              }
            });
          }
        );

        req.on('error', err => reject(err));
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Connection timed out while reaching GitHub Releases.'));
        });
      });

      const currentVer = app ? app.getVersion() : '1.0.1';
      const latestTag = checkResult?.tag_name ? checkResult.tag_name.replace(/^v/, '') : currentVer;
      const isNewer = this.compareVersions(latestTag, currentVer) > 0;

      this.currentStatus = {
        currentVersion: currentVer,
        latestVersion: latestTag,
        updateAvailable: isNewer,
        releaseNotes: checkResult?.body || 'New enhancements and stability improvements.',
        status: isNewer ? 'available' : 'not-available',
        lastChecked: new Date().toISOString(),
      };

      if (isNewer) {
        this.logUpdateActivity('UPDATE_AVAILABLE', `Version ${latestTag} found on GitHub Releases`, 'success');
      }

      this.notifyWindow();

      // If packaged and update is available, trigger autoUpdater check to prep binary download
      if (app && app.isPackaged) {
        try {
          await autoUpdater.checkForUpdates();
        } catch (e) {}
      }

      return this.currentStatus;
    } catch (err: any) {
      this.currentStatus.status = 'error';
      this.currentStatus.errorMessage = `Could not reach GitHub Releases server (${err.message || 'Network unreachable'}).`;
      this.currentStatus.lastChecked = new Date().toISOString();
      this.notifyWindow();
      return this.currentStatus;
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
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
