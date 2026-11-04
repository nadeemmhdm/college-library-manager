import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, ArrowUpCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { UpdateInfo } from '../../../shared/types';

export const UpdatesView: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    currentVersion: '1.0.0',
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
      setUpdateInfo(info);
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <ArrowUpCircle className="w-5 h-5 text-blue-500" />
          <span>Application Updates</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Automatic GitHub Releases update checker with seamless delta download and NSIS installer integration.
        </p>
      </div>

      {/* Main Status Box */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Installed Version</span>
            <span className="text-2xl font-black text-white font-mono">v{updateInfo.currentVersion}</span>
          </div>

          <button
            type="button"
            disabled={checking}
            onClick={handleCheck}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/20 transition"
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
                No new releases found on GitHub Releases repository.
              </div>
            </div>
          </div>
        )}

        {updateInfo.status === 'error' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="font-bold">Update Check Offline / Notice</div>
              <div className="text-[11px] text-amber-200">
                {updateInfo.errorMessage || 'Unable to connect to GitHub. College Library Manager continues working offline.'}
              </div>
            </div>
          </div>
        )}

        {/* Update Available Box */}
        {updateInfo.updateAvailable && (
          <div className="p-5 rounded-2xl bg-blue-950/60 border border-blue-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">New Version Available: v{updateInfo.latestVersion}</span>
                <span className="text-[11px] text-slate-300 block">
                  A new release has been published on GitHub with updates and security improvements.
                </span>
              </div>

              {updateInfo.status === 'downloaded' ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                >
                  Restart & Install Now
                </button>
              ) : (
                <button
                  type="button"
                  disabled={updateInfo.status === 'downloading'}
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{updateInfo.status === 'downloading' ? 'Downloading...' : 'Download Update'}</span>
                </button>
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
          <span>Secure Update Architecture</span>
        </div>
        <p>
          Updates are validated against cryptographic checksums and installed via standard Windows NSIS package manager.
          All library database records in %APPDATA%/CollegeLibraryManager/ remain completely preserved during and after application updates.
        </p>
      </div>
    </div>
  );
};
