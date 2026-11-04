import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  BookOpen,
  Palette,
  Shield,
  Info,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';
import {
  CollegeProfile,
  LibraryConfig,
  AppearanceSettings,
  AppSettings,
} from '../../../shared/types';

interface SettingsViewProps {
  college: CollegeProfile | null;
  onCollegeUpdated: (updated: CollegeProfile) => void;
  onThemeChanged: (appearance: AppearanceSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  college,
  onCollegeUpdated,
  onThemeChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'college' | 'library' | 'appearance' | 'security' | 'about'>('college');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // College form state
  const [collegeData, setCollegeData] = useState<CollegeProfile>({
    id: 'default',
    name: college?.name || '',
    shortName: college?.shortName || '',
    logoDataUrl: college?.logoDataUrl || '',
    address: college?.address || '',
    district: college?.district || '',
    state: college?.state || '',
    country: college?.country || 'India',
    email: college?.email || '',
    phone: college?.phone || '',
    website: college?.website || '',
    libraryName: college?.libraryName || '',
    libraryDescription: college?.libraryDescription || '',
    updatedAt: '',
  });

  // Library config state
  const [libraryConfig, setLibraryConfig] = useState<LibraryConfig | null>(null);

  // Appearance state
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'light',
    primaryColor: '#2563eb',
    sidebarAppearance: 'expanded',
    tableDensity: 'comfortable',
  });

  // Security password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // App info
  const [appInfo, setAppInfo] = useState<{
    name: string;
    version: string;
    appDataPath: string;
    databasePath: string;
  } | null>(null);

  useEffect(() => {
    window.electronAPI.getLibraryConfig().then(cfg => {
      if (cfg) setLibraryConfig(cfg);
    });
    window.electronAPI.getAppearance().then(app => {
      if (app) setAppearance(app);
    });
    window.electronAPI.getAppInfo().then(info => {
      if (info) setAppInfo(info);
    });
  }, []);

  const handleLogoUpload = async () => {
    try {
      const dataUrl = await window.electronAPI.openImageDialog();
      if (dataUrl) {
        setCollegeData(prev => ({ ...prev, logoDataUrl: dataUrl }));
      }
    } catch (e) {}
  };

  const handleSaveCollegeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await window.electronAPI.updateCollegeProfile(collegeData);
      if (res.success) {
        setMessage('College branding updated successfully!');
        onCollegeUpdated(collegeData);
      } else {
        setError(res.error || 'Failed to update college profile.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveLibraryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryConfig) return;
    setMessage(null);
    setError(null);
    try {
      const res = await window.electronAPI.updateLibraryConfig(libraryConfig);
      if (res.success) {
        setMessage('Library circulation rules updated successfully!');
      } else {
        setError(res.error || 'Failed to update library configuration.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveAppearance = async (newApp: AppearanceSettings) => {
    setAppearance(newApp);
    await window.electronAPI.updateAppearance(newApp);
    onThemeChanged(newApp);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await window.electronAPI.changePassword({ oldPassword, newPassword });
      if (res.success) {
        setMessage('Librarian password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.error || 'Password update failed.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const primaryColors = [
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Deep Purple', hex: '#7c3aed' },
    { name: 'Teal Cyan', hex: '#0d9488' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Slate Gray', hex: '#475569' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-500" />
          <span>System Settings & Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage college branding, circulation limits, appearance, security credentials, and directory persistence.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        {[
          { key: 'college', label: 'College Profile & Logo', icon: Building2 },
          { key: 'library', label: 'Circulation Rules', icon: BookOpen },
          { key: 'appearance', label: 'Appearance & Themes', icon: Palette },
          { key: 'security', label: 'Security & Password', icon: Shield },
          { key: 'about', label: 'About & Persistence', icon: Info },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveTab(t.key as any);
                setMessage(null);
                setError(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${
                activeTab === t.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: COLLEGE PROFILE */}
      {activeTab === 'college' && (
        <form onSubmit={handleSaveCollegeProfile} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-xl">
          <div className="flex items-center space-x-6 pb-4 border-b border-slate-800">
            {collegeData.logoDataUrl ? (
              <img
                src={collegeData.logoDataUrl}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-xl bg-slate-950 p-2 border border-slate-800"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-slate-950 flex items-center justify-center text-slate-500 border border-slate-800">
                No Logo
              </div>
            )}
            <div className="space-y-1">
              <div className="font-bold text-white text-sm">College Emblem / Logo</div>
              <div className="text-slate-400">Used on login screen, printed book labels, and ID cards.</div>
              <button
                type="button"
                onClick={handleLogoUpload}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 mt-1"
              >
                <Upload className="w-3 h-3" />
                <span>Replace Logo Image</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">College Full Name</label>
              <input
                type="text"
                required
                value={collegeData.name}
                onChange={e => setCollegeData({ ...collegeData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Short Name / Acronym</label>
              <input
                type="text"
                required
                value={collegeData.shortName}
                onChange={e => setCollegeData({ ...collegeData, shortName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Library Name</label>
              <input
                type="text"
                required
                value={collegeData.libraryName}
                onChange={e => setCollegeData({ ...collegeData, libraryName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={collegeData.email}
                onChange={e => setCollegeData({ ...collegeData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={collegeData.phone}
                onChange={e => setCollegeData({ ...collegeData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Website URL</label>
              <input
                type="text"
                value={collegeData.website || ''}
                onChange={e => setCollegeData({ ...collegeData, website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20"
            >
              Save Branding Changes
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: LIBRARY CIRCULATION RULES */}
      {activeTab === 'library' && libraryConfig && (
        <form onSubmit={handleSaveLibraryConfig} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Default Issue Duration (Days)</label>
              <input
                type="number"
                min="1"
                value={libraryConfig.defaultIssueDurationDays}
                onChange={e =>
                  setLibraryConfig({ ...libraryConfig, defaultIssueDurationDays: parseInt(e.target.value, 10) || 14 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Student Max Books</label>
              <input
                type="number"
                min="1"
                value={libraryConfig.maxBooksStudent}
                onChange={e =>
                  setLibraryConfig({ ...libraryConfig, maxBooksStudent: parseInt(e.target.value, 10) || 3 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Teacher Max Books</label>
              <input
                type="number"
                min="1"
                value={libraryConfig.maxBooksTeacher}
                onChange={e =>
                  setLibraryConfig({ ...libraryConfig, maxBooksTeacher: parseInt(e.target.value, 10) || 10 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Daily Overdue Fine Amount</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={libraryConfig.dailyOverdueFine}
                onChange={e =>
                  setLibraryConfig({ ...libraryConfig, dailyOverdueFine: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Maximum Fine Cap Per Book</label>
              <input
                type="number"
                min="0"
                value={libraryConfig.maxFinePerBook}
                onChange={e =>
                  setLibraryConfig({ ...libraryConfig, maxFinePerBook: parseFloat(e.target.value) || 200 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={libraryConfig.currency}
                onChange={e => setLibraryConfig({ ...libraryConfig, currency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20"
            >
              Save Circulation Rules
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 text-xs shadow-xl">
          <div>
            <label className="block font-bold text-slate-200 mb-2">Display Theme</label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['light', 'dark', 'system'] as const).map(theme => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => handleSaveAppearance({ ...appearance, theme })}
                  className={`py-3 rounded-xl border text-center capitalize font-semibold text-xs ${
                    appearance.theme === theme
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-200 mb-2">Primary Accent Color</label>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {primaryColors.map(color => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => handleSaveAppearance({ ...appearance, primaryColor: color.hex })}
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
                    appearance.primaryColor === color.hex
                      ? 'border-white bg-slate-800 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color.hex }} />
                  <span>{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & CREDENTIALS */}
      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-md text-xs shadow-xl">
          <div className="font-bold text-white text-sm">Change Librarian Password</div>
          <p className="text-slate-400 text-[11px]">Password is hashed with Argon2id/PBKDF2 with unique cryptographic salt.</p>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Current Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">New Password (Min 8 characters)</label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="text-slate-400 hover:text-white flex items-center space-x-1"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPwd ? 'Hide' : 'Show'} Password</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Update Password
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: ABOUT & PERSISTENCE */}
      {activeTab === 'about' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs shadow-xl">
          <div className="flex items-center space-x-3">
            <img
              src="./logo.svg"
              alt="Logo"
              className="w-12 h-12 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-md"
            />
            <div>
              <div className="font-extrabold text-white text-base">College Library Manager</div>
              <div className="text-slate-400 text-xs">
                Version {appInfo?.version || '1.0.0'} &bull; Windows x64 &bull; Developed by <span className="text-white font-bold">NM Developers</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
            <div className="font-bold text-white text-xs">Local Data Directory Structure (%APPDATA%):</div>
            <div className="font-mono text-[11px] text-blue-400 break-all">{appInfo?.appDataPath}</div>
            <div className="text-[11px] text-slate-400">
              Database: <span className="font-mono text-slate-300">{appInfo?.databasePath}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (appInfo?.appDataPath) window.electronAPI.openFolder(appInfo.appDataPath);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Open Local AppData Directory</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
