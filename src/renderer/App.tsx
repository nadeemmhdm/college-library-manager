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
  Laptop,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CollegeProfile, AppearanceSettings, ThemeMode, BorrowerType } from '../shared/types';
import { SetupWizard } from './components/setup/SetupWizard';
import { LoginScreen } from './components/auth/LoginScreen';
import { LockScreen } from './components/auth/LockScreen';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { SplashScreen } from './components/common/SplashScreen';
import { ThemeSelectorModal } from './components/common/ThemeSelectorModal';

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
  const [showSplash, setShowSplash] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [college, setCollege] = useState<CollegeProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [preselectedBorrower, setPreselectedBorrower] = useState<{
    type: BorrowerType;
    data: any;
  } | null>(null);

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
          if (app.sidebarAppearance === 'collapsed') {
            setIsSidebarCollapsed(true);
          }
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
      // system auto-detect
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    root.style.setProperty('--primary-color', app.primaryColor);
  };

  // Real-time listener for Windows OS system theme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (appearance.theme === 'system') {
        applyTheme(appearance);
      }
    };
    mql.addEventListener('change', handleSystemThemeChange);
    return () => mql.removeEventListener('change', handleSystemThemeChange);
  }, [appearance]);

  const handleSelectTheme = async (theme: ThemeMode) => {
    const updated = { ...appearance, theme };
    setAppearance(updated);
    applyTheme(updated);
    try {
      await window.electronAPI.updateAppearance(updated);
    } catch (e) {}
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

  // Splash Screen (7 seconds)
  if (showSplash) {
    return <SplashScreen onFinished={() => setShowSplash(false)} durationMs={7000} />;
  }

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
      {/* Sidebar (Supports Collapsible/Expandable View) */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 z-20 transition-all duration-300 ease-in-out`}
      >
        <div>
          {/* College Branding Sidebar Header with Collapse Toggle */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-center">
            {isSidebarCollapsed ? (
              <div className="w-full flex flex-col items-center py-1 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Expand Navigation (Click to expand)"
                  className="group relative p-0.5 rounded-2xl transition hover:ring-2 hover:ring-blue-500/50 active:scale-95"
                >
                  <img
                    src={college?.logoDataUrl || './logo.png'}
                    alt="Logo"
                    className="w-11 h-11 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-md group-hover:scale-105 transition"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  title="Expand Sidebar"
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <img
                    src={college?.logoDataUrl || './logo.png'}
                    alt="Logo"
                    className="w-10 h-10 object-contain rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-md flex-shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-bold text-white text-xs truncate">{college?.name || 'College Library'}</div>
                    <div className="text-[10px] text-slate-400 truncate">{college?.libraryName || 'Central Library'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  title="Collapse Sidebar"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-90 flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items List */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={isSidebarCollapsed ? item.label : undefined}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'
                  } py-2.5 rounded-xl text-xs font-semibold active:scale-95 transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Librarian Account Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <>
              <div className="truncate pr-2">
                <div className="font-bold text-white text-xs truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-400 font-mono">@{currentUser.username}</div>
                <div className="text-[9px] text-blue-400 font-medium">NM Developers</div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleLock}
                  title="Lock Session (Ctrl+L)"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-90"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log Out"
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition active:scale-90"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={handleLock}
                title="Lock Session (Ctrl+L)"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition active:scale-90"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition active:scale-90"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center space-x-3 max-w-sm w-full">
            {/* Sidebar toggle shortcut in header */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              title="Toggle Sidebar"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition active:scale-95"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Global Search Bar Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex-1 flex items-center space-x-2 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-400 transition"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="flex-1 text-left truncate">Search catalog & patrons...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right Header Status & Action Controls */}
          <div className="flex items-center space-x-3">
            <div className="text-[11px] text-slate-400 hidden md:flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              <span>Offline Database Connected</span>
            </div>

            {/* Quick Theme Switcher Button */}
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              title={`Active Theme: ${appearance.theme.toUpperCase()} (Click to change)`}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition active:scale-95 flex items-center space-x-1.5"
            >
              {appearance.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : appearance.theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Laptop className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-[11px] font-medium hidden sm:inline capitalize">{appearance.theme}</span>
            </button>

            {/* Settings Navigation */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition active:scale-95"
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
          {activeTab === 'students' && (
            <StudentsView
              college={college}
              onNavigateToIssue={student => {
                setPreselectedBorrower({ type: 'student', data: student });
                setActiveTab('issue');
              }}
            />
          )}
          {activeTab === 'teachers' && (
            <TeachersView
              college={college}
              onNavigateToIssue={teacher => {
                setPreselectedBorrower({ type: 'teacher', data: teacher });
                setActiveTab('issue');
              }}
            />
          )}
          {activeTab === 'issue' && (
            <IssueView college={college} preselectedBorrower={preselectedBorrower} />
          )}
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

      {/* Theme Selection Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={appearance.theme}
        onSelectTheme={handleSelectTheme}
      />
    </div>
  );
};
