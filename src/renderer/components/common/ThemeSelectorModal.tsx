import React from 'react';
import { Sun, Moon, Laptop, Check, X } from 'lucide-react';
import { AppearanceSettings, ThemeMode } from '../../../shared/types';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  onSelectTheme: (theme: ThemeMode) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const themes: Array<{ mode: ThemeMode; title: string; desc: string; icon: any }> = [
    {
      mode: 'light',
      title: 'Light Theme',
      desc: 'Clean, bright, high-contrast daylight aesthetic with crisp typography.',
      icon: Sun,
    },
    {
      mode: 'dark',
      title: 'Dark Theme',
      desc: 'Deep slate background, reduced eye strain, premium modern glow.',
      icon: Moon,
    },
    {
      mode: 'system',
      title: 'System (Auto-Detect)',
      desc: 'Automatically synchronizes in real-time with your Windows OS light/dark setting.',
      icon: Laptop,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Theme & Appearance</h3>
              <p className="text-[11px] text-slate-400">Choose your preferred workspace aesthetic</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {themes.map(t => {
            const Icon = t.icon;
            const isSelected = currentTheme === t.mode;
            return (
              <button
                key={t.mode}
                type="button"
                onClick={() => {
                  onSelectTheme(t.mode);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center space-x-2">
                      <span>{t.title}</span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-semibold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold active:scale-95 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
