import React, { useState } from 'react';
import { Lock, LogOut, ArrowRight, ShieldAlert } from 'lucide-react';
import { CollegeProfile } from '../../../shared/types';

interface LockScreenProps {
  college: CollegeProfile | null;
  librarianName: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ college, librarianName, onUnlock, onLogout }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.unlockSession({ password });
      if (res.success) {
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unlock error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-sm w-full bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Session Locked</h2>
          <p className="text-xs text-slate-400 mt-1">Logged in as <span className="text-blue-400 font-semibold">{librarianName}</span></p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2 text-left">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            autoFocus
            required
            placeholder="Enter password to resume"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 text-center"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 transition"
          >
            <span>{loading ? 'Verifying...' : 'Unlock Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center space-x-1.5 mx-auto pt-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out completely</span>
        </button>
      </div>
    </div>
  );
};
