import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  ExternalLink,
  ShieldCheck,
  Globe,
  Clock,
} from 'lucide-react';
import { UpdateInfo } from '../../../shared/types';

export const UpdatesView: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    currentVersion: '1.0.4',
    updateAvailable: false,
    status: 'idle',
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    window.electronAPI.getUpdateStatus().then(status => {
      if (status) setUpdateInfo(status);
    });

    const cleanup = window.electronAPI.onUpdateStatusChanged((status: UpdateInfo) => {
      setUpdateInfo(status);
      setChecking(status.status === 'checking');
    });

    return () => cleanup();
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const info = await window.electronAPI.checkForUpdates();
      if (info) setUpdateInfo(info);
    } catch (e) {
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = async () => {
    try {
      await window.electronAPI.downloadUpdate();
    } catch (e) {}
  };

  const handleInstall = () => {
    window.electronAPI.installUpdate();
  };

  const openGitHubReleases = () => {
    window.electronAPI.openExternalUrl('https://github.com/nadeemmhdm/college-library-manager/releases');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <ArrowUpCircle className="w-5 h-5 text-blue-500" />
            <span>Application Updates</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic GitHub Releases updates with NSIS installer and secure pre-update backup.
          </p>
        </div>

        <button
          type="button"
          onClick={openGitHubReleases}
          title="Open releases on GitHub in web browser"
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 active:scale-95 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span>GitHub Releases</span>
        </button>
      </div>

      {/* Main Status Box */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Installed Version</span>
            <span className="text-2xl font-black text-white font-mono">v{updateInfo.currentVersion}</span>
            {updateInfo.lastChecked && (
              <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Last checked: {new Date(updateInfo.lastChecked).toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={checking}
            onClick={handleCheck}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/20 active:scale-95 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking GitHub...' : 'Check for Updates'}</span>
          </button>
        </div>

        {/* Status Alerts */}
        {updateInfo.status === 'not-available' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold">You are running the latest version!</div>
              <div className="text-[11px] text-emerald-200">
                Your installation is completely up to date with the official GitHub Releases repository.
              </div>
            </div>
          </div>
        )}

        {updateInfo.status === 'error' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold">Update Server Connection Notice</div>
              <div className="text-[11px] text-amber-200">
                {updateInfo.errorMessage || 'Unable to connect to GitHub. College Library Manager continues working offline.'}
              </div>
              <button
                type="button"
                onClick={openGitHubReleases}
                className="mt-1 text-[11px] text-amber-300 hover:text-white underline font-semibold flex items-center space-x-1"
              >
                <span>Download setup directly from GitHub Releases</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Update Available Box */}
        {updateInfo.updateAvailable && (
          <div className="p-5 rounded-2xl bg-blue-950/60 border border-blue-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-white">
                  New Version Available: v{updateInfo.latestVersion}
                </span>
                <span className="text-[11px] text-slate-300 block">
                  A new release has been published on GitHub with enhancements and bug fixes.
                </span>
              </div>

              {updateInfo.status === 'downloaded' ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                >
                  Restart & Install Now
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={updateInfo.status === 'downloading'}
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center space-x-1.5 active:scale-95 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{updateInfo.status === 'downloading' ? 'Downloading...' : 'Download Update'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={openGitHubReleases}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition"
                  >
                    Direct Download
                  </button>
                </div>
              )}
            </div>

            {/* Download Progress Bar */}
            {updateInfo.status === 'downloading' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Downloading Windows NSIS Package...</span>
                  <span className="font-bold">{updateInfo.downloadProgress ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateInfo.downloadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Release notes */}
            {updateInfo.releaseNotes && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Release Notes
                </span>
                <div className="text-slate-400 text-xs whitespace-pre-wrap">{updateInfo.releaseNotes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GitHub Releases Architecture Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs text-slate-400">
        <div className="font-bold text-slate-200 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure Offline-First Architecture</span>
        </div>
        <p>
          Updates are validated against cryptographic checksums and installed via standard Windows NSIS package manager.
          All library database records in %APPDATA%/CollegeLibraryManager/ remain completely preserved during and after application updates.
        </p>
      </div>
    </div>
  );
};
