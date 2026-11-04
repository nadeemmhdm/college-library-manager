import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, HardDrive, Sparkles, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onFinished: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished, durationMs = 7000 }) => {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing Offline Library Engine...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct < 25) {
        setStatusMessage('Initializing SQLite WebAssembly Core...');
      } else if (pct < 50) {
        setStatusMessage('Mounting Windows DPAPI AES-256 Encrypted Storage...');
      } else if (pct < 75) {
        setStatusMessage('Loading Central Catalog & Patron Indices...');
      } else if (pct < 98) {
        setStatusMessage('Verifying Offline Security Protocols & Integrity...');
      } else {
        setStatusMessage('System Ready. Launching Management Console...');
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(onFinished, 200);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs, onFinished]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col justify-between p-8 select-none overflow-hidden font-sans">
      {/* Background radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Offline Desktop System</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            v1.0.0
          </span>
          <button
            type="button"
            onClick={onFinished}
            className="text-xs px-3 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition flex items-center space-x-1"
          >
            <span>Skip</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Center Branding & Logo */}
      <div className="flex flex-col items-center justify-center text-center relative z-10 max-w-lg mx-auto space-y-6">
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-amber-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse" />
          <img
            src="./logo.svg"
            alt="College Library Manager Logo"
            className="w-32 h-32 object-contain relative rounded-3xl shadow-2xl drop-shadow-[0_15px_25px_rgba(37,99,235,0.35)]"
          />
        </div>

        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            College Library Manager
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            Professional Offline Desktop System for Collegiate Libraries
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className="font-mono">{statusMessage}</span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-amber-400 transition-all duration-100 ease-out shadow-sm shadow-blue-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Loading local database</span>
            <span className="text-blue-400 font-bold">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Credit */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 relative z-10 border-t border-slate-900/80 pt-4">
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <span className="flex items-center space-x-1">
            <Database className="w-3.5 h-3.5 text-slate-600" />
            <span>SQLite Embedded</span>
          </span>
          <span>&bull;</span>
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-600" />
            <span>Windows DPAPI</span>
          </span>
        </div>
        <div className="font-medium text-slate-400">
          Developed by <span className="font-bold text-white tracking-wide">NM Developers</span>
        </div>
      </div>
    </div>
  );
};
