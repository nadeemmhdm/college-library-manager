import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Download,
  RotateCcw,
  CheckCircle2,
  FolderOpen,
  Usb,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { BackupConfig, BackupItem } from '../../../shared/types';

export const BackupRestoreView: React.FC = () => {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const [cfg, list] = await Promise.all([
        window.electronAPI.getBackupConfig(),
        window.electronAPI.listBackups(),
      ]);
      setConfig(cfg);
      setBackups(list);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  const handleCreateBackup = async () => {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await window.electronAPI.createBackup('manual');
      if (res.success && res.backup) {
        setActionMessage(`Backup created successfully: ${res.backup.fileName}`);
        loadBackupData();
      } else {
        setActionError(res.error || 'Failed to create backup.');
      }
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleSelectCustomDestination = async () => {
    try {
      const folder = await window.electronAPI.selectBackupDestination();
      if (folder && config) {
        await window.electronAPI.updateBackupConfig({ backupDestination: folder });
        setConfig({ ...config, backupDestination: folder });
      }
    } catch (e) {}
  };

  const handleRestoreBackup = async () => {
    const filePath = await window.electronAPI.selectRestoreFile();
    if (!filePath) return;

    if (
      !confirm(
        'RESTORATION WARNING:\n\nA pre-restore snapshot of your current database will be saved automatically.\n\nAre you sure you want to restore the database from this backup file?'
      )
    ) {
      return;
    }

    setActionMessage(null);
    setActionError(null);
    try {
      const res = await window.electronAPI.restoreBackup(filePath);
      if (res.success) {
        alert('Database successfully restored and verified! Reloading records...');
        window.location.reload();
      } else {
        setActionError(res.error || 'Restore failed. Original data was safely preserved.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Restoration failed.');
    }
  };

  const handleToggleAutoBackup = async (enabled: boolean) => {
    if (!config) return;
    try {
      await window.electronAPI.updateBackupConfig({ autoBackupEnabled: enabled });
      setConfig({ ...config, autoBackupEnabled: enabled });
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <span>Database Backup & Restoration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create encrypted database snapshots, manage automated schedules, and restore data safely.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRestoreBackup}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>

          <button
            type="button"
            onClick={handleCreateBackup}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Create Backup Now</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Backup Settings Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">Automated Schedule</span>
            <input
              type="checkbox"
              checked={config?.autoBackupEnabled ?? true}
              onChange={e => handleToggleAutoBackup(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Frequency:</span>
              <span className="font-semibold text-white capitalize">{config?.frequency || 'Daily'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Scheduled Time:</span>
              <span className="font-semibold text-white">{config?.backupTime || '23:00'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Retention Count:</span>
              <span className="font-semibold text-white">{config?.backupRetentionCount || 14} backups</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="font-bold text-white text-sm flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span>Backup Storage Destination</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300 break-all text-[11px] flex items-center justify-between">
            <span>{config?.backupDestination || '%APPDATA%/CollegeLibraryManager/Backups'}</span>
            <button
              type="button"
              onClick={handleSelectCustomDestination}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs ml-3 font-semibold"
            >
              Browse Folder
            </button>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <div>&bull; Backups are fully encrypted using AES-256 with Windows DPAPI protection.</div>
            <div>&bull; Before any database restore or update, a safety backup snapshot is created automatically.</div>
          </div>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-white text-sm">Backup History Archive ({backups.length})</div>
          <button
            type="button"
            onClick={loadBackupData}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Backup File Name</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">SHA-256 Checksum</th>
                <th className="py-3 px-4 text-center">Encryption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {backups.length > 0 ? (
                backups.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white text-xs">{b.fileName}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {Math.max(1, Math.round(b.fileSizeBytes / 1024))} KB
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                        {b.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 truncate max-w-xs">{b.checksum}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        AES-256 Encrypted
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No backup files found yet. Click "Create Backup Now" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
