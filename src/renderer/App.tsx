import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Users,
  Clock,
  CheckCircle,
  Bookmark,
  Coins,
  FileText,
  HardDrive,
  ArrowUpCircle,
  Settings,
  Search,
  Lock,
  LogOut,
  Bell,
  Sun,
  Moon,
  Shield,
  Menu,
} from 'lucide-react';
import { CollegeProfile, AppearanceSettings } from '../shared/types';
import { SetupWizard } from './components/setup/SetupWizard';
import { LoginScreen } from './components/auth/LoginScreen';
import { LockScreen } from './components/auth/LockScreen';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { BooksView } from './components/views/BooksView';
import { StudentsView } from './components/views/StudentsView';
import { TeachersView } from './components/views/TeachersView';
import { IssueView } from './components/views/IssueView';
import { ReturnView } from './components/views/ReturnView';
import { ReservationsView } from './components/views/ReservationsView';
import { FinesView } from './components/views/FinesView';
import { ReportsView } from './components/views/ReportsView';
import { BackupRestoreView } from './components/views/BackupRestoreView';
import { UpdatesView } from './components/views/UpdatesView';
import { SettingsView } from './components/views/SettingsView';

export const App: React.FC = () => {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [college, setCollege] = useState<CollegeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'light',
    primaryColor: '#2563eb',
    sidebarAppearance: 'expanded',
    tableDensity: 'comfortable',
  });

  const inactivityTimerRef = useRef<any>(null);

  // Initialize and check setup status
  const initializeApp = async () => {
    try {
      const status = await window.electronAPI.getSetupStatus();
      setSetupCompleted(status.isCompleted);

      if (status.isCompleted) {
        const [prof, app, session] = await Promise.all([
          window.electronAPI.getCollegeProfile(),
          window.electronAPI.getAppearance(),
          window.electronAPI.getSession(),
        ]);
        if (prof) setCollege(prof);
        if (app) {
          setAppearance(app);
          applyTheme(app);
        }
        if (session && session.username) {
          setCurrentUser(session);
          setIsLocked(session.isLocked);
        }
      }
    } catch (e) {
      setSetupCompleted(false);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  // Theme application
  const applyTheme = (app: AppearanceSettings) => {
    const root = document.documentElement;
    if (app.theme === 'dark') {
      root.classList.add('dark');
    } else if (app.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    root.style.setProperty('--primary-color', app.primaryColor);
  };

  // Inactivity auto-lock listener
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (currentUser && !isLocked) {
      // Auto-lock after 15 minutes of inactivity
      inactivityTimerRef.current = setTimeout(async () => {
        await window.electronAPI.lockSession();
        setIsLocked(true);
      }, 15 * 60 * 1000);
    }
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [currentUser, isLocked]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setIsSearchOpen(prev => !prev);
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setActiveTab('books');
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          setActiveTab('issue');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setActiveTab('return');
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          handleLock();
        } else if (e.key === ',') {
          e.preventDefault();
          setActiveTab('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLock = async () => {
    await window.electronAPI.lockSession();
    setIsLocked(true);
  };

  const handleLogout = async () => {
    await window.electronAPI.logout();
    setCurrentUser(null);
    setIsLocked(false);
  };

  // Loading state
  if (setupCompleted === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Starting College Library Manager...</span>
        </div>
      </div>
    );
  }

  // First-time setup wizard
  if (!setupCompleted) {
    return (
      <SetupWizard
        onComplete={async () => {
          setSetupCompleted(true);
          await initializeApp();
        }}
      />
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <LoginScreen
        college={college}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setIsLocked(false);
        }}
      />
    );
  }

  // Session locked
  if (isLocked) {
    return (
      <LockScreen
        college={college}
        librarianName={currentUser.fullName || currentUser.username}
        onUnlock={() => setIsLocked(false)}
        onLogout={handleLogout}
      />
    );
  }

  // Navigation Items
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'books', label: 'Book Inventory', icon: BookOpen },
    { key: 'students', label: 'Students', icon: GraduationCap },
    { key: 'teachers', label: 'Faculty & Teachers', icon: Users },
    { key: 'issue', label: 'Book Issue', icon: Clock },
    { key: 'return', label: 'Book Return', icon: CheckCircle },
    { key: 'reservations', label: 'Reservations', icon: Bookmark },
    { key: 'fines', label: 'Fines & Penalties', icon: Coins },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'backup', label: 'Backup & Restore', icon: HardDrive },
    { key: 'updates', label: 'Updates', icon: ArrowUpCircle },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-20">
        <div>
          {/* College Branding Sidebar Header */}
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
            {college?.logoDataUrl ? (
              <img
                src={college.logoDataUrl}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 flex-shrink-0"
              />
            ) : (
              <img
                src="./logo.svg"
                alt="Logo"
                className="w-10 h-10 object-contain rounded-xl bg-slate-950 p-0.5 border border-slate-800 flex-shrink-0 shadow-lg shadow-blue-500/10"
              />
            )}
            <div className="truncate">
              <div className="font-bold text-white text-sm truncate">{college?.name || 'College Library'}</div>
              <div className="text-[11px] text-slate-400 truncate">{college?.libraryName || 'Central Library'}</div>
            </div>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Librarian Account Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="font-bold text-white text-xs truncate">{currentUser.fullName}</div>
            <div className="text-[10px] text-slate-400 font-mono">@{currentUser.username}</div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleLock}
              title="Lock Session (Ctrl+L)"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-10">
          {/* Global Search Bar Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-400 max-w-sm w-full transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="flex-1 text-left truncate">Search library catalog & patrons...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Header Status */}
          <div className="flex items-center space-x-4">
            <div className="text-[11px] text-slate-400 hidden md:block">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              <span>Offline Database Connected</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <DashboardView college={college} onNavigate={tab => setActiveTab(tab)} />
          )}
          {activeTab === 'books' && <BooksView college={college} />}
          {activeTab === 'students' && <StudentsView college={college} />}
          {activeTab === 'teachers' && <TeachersView college={college} />}
          {activeTab === 'issue' && <IssueView college={college} />}
          {activeTab === 'return' && <ReturnView college={college} />}
          {activeTab === 'reservations' && <ReservationsView />}
          {activeTab === 'fines' && <FinesView college={college} />}
          {activeTab === 'reports' && <ReportsView college={college} />}
          {activeTab === 'backup' && <BackupRestoreView />}
          {activeTab === 'updates' && <UpdatesView />}
          {activeTab === 'settings' && (
            <SettingsView
              college={college}
              onCollegeUpdated={updated => setCollege(updated)}
              onThemeChanged={app => {
                setAppearance(app);
                applyTheme(app);
              }}
            />
          )}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectBook={b => {
          setActiveTab('books');
        }}
        onSelectStudent={s => {
          setActiveTab('students');
        }}
        onSelectTeacher={t => {
          setActiveTab('teachers');
        }}
      />
    </div>
  );
};
