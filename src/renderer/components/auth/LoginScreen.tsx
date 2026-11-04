import React, { useState, useEffect } from 'react';
import { BookOpen, Lock, User, Eye, EyeOff, ShieldAlert, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { CollegeProfile } from '../../../shared/types';

interface LoginScreenProps {
  college: CollegeProfile | null;
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ college, onLoginSuccess }) => {
  const [username, setUsername] = useState(localStorage.getItem('clm_remembered_user') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('clm_remembered_user'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password / Recovery State
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // 1: verify key, 2: set new password
  const [recUsername, setRecUsername] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recError, setRecError] = useState<string | null>(null);
  const [recSuccess, setRecSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.login({ username: username.trim(), password });
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem('clm_remembered_user', username.trim());
        } else {
          localStorage.removeItem('clm_remembered_user');
        }
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login error.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recUsername.trim() || !recoveryKey.trim()) {
      setRecError('Please enter username and recovery key.');
      return;
    }

    setLoading(true);
    setRecError(null);
    try {
      const res = await window.electronAPI.verifyRecoveryKey({
        username: recUsername.trim(),
        recoveryKey: recoveryKey.trim(),
      });
      if (res.valid) {
        setRecoveryStep(2);
      } else {
        setRecError('Invalid recovery key for this username.');
      }
    } catch (err: any) {
      setRecError(err.message || 'Verification error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setRecError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setRecError(null);
    try {
      const res = await window.electronAPI.resetPassword({
        username: recUsername.trim(),
        recoveryKey: recoveryKey.trim(),
        newPassword,
      });
      if (res.success) {
        setRecSuccess('Password successfully reset! You can now log in.');
        setTimeout(() => {
          setIsRecovering(false);
          setRecoveryStep(1);
          setRecSuccess(null);
          setPassword('');
        }, 2000);
      } else {
        setRecError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setRecError(err.message || 'Reset error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between text-slate-100 p-6">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-md mx-auto w-full pt-8 text-center relative z-10">
        {college?.logoDataUrl ? (
          <img
            src={college.logoDataUrl}
            alt={college.name}
            className="w-20 h-20 object-contain mx-auto rounded-2xl bg-slate-800/80 p-2 shadow-xl border border-slate-700 mb-4"
          />
        ) : (
          <img
            src="./logo.svg"
            alt="College Library Manager Logo"
            className="w-20 h-20 object-contain mx-auto rounded-2xl shadow-xl shadow-blue-500/20 mb-4"
          />
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white">{college?.name || 'College Library Manager'}</h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">{college?.libraryName || 'Central Library System'}</p>
      </div>

      {/* Login Card */}
      <div className="max-w-md mx-auto w-full my-6 bg-slate-950/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl relative z-10">
        {!isRecovering ? (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Librarian Authentication</h2>
              <p className="text-xs text-slate-400">Please enter your credentials to access the library management console.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecovering(true);
                      setRecUsername(username);
                      setRecError(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Remember Username</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition flex items-center justify-center space-x-2 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* Password Recovery Modal */
          <div>
            <button
              type="button"
              onClick={() => {
                setIsRecovering(false);
                setRecoveryStep(1);
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>

            <div className="mb-5">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <span>Account Recovery</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {recoveryStep === 1
                  ? 'Verify your cryptographic recovery key.'
                  : 'Set a new secure password for your administrator account.'}
              </p>
            </div>

            {recError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{recError}</span>
              </div>
            )}

            {recSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{recSuccess}</span>
              </div>
            )}

            {recoveryStep === 1 ? (
              <form onSubmit={handleVerifyKey} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Librarian Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={recUsername}
                    onChange={e => setRecUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Recovery Key (CLMR-XXXX-...)</label>
                  <input
                    type="text"
                    required
                    placeholder="CLMR-XXXX-XXXX-XXXX-XXXX"
                    value={recoveryKey}
                    onChange={e => setRecoveryKey(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 transition"
                >
                  {loading ? 'Verifying Key...' : 'Verify Recovery Key'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (Min 8 characters)</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition"
                >
                  {loading ? 'Updating Password...' : 'Save New Password & Return'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 relative z-10">
        College Library Manager &bull; Protected by Windows DPAPI & Local Encrypted Storage
      </div>
    </div>
  );
};
