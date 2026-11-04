import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  GraduationCap,
  Users,
  Coins,
  BookmarkCheck,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DashboardStats, ActivityLog, CollegeProfile } from '../../../shared/types';

interface DashboardViewProps {
  college: CollegeProfile | null;
  onNavigate: (tab: string) => void;
  currency?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ college, onNavigate, currency = '₹' }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [mostBorrowed, setMostBorrowed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a, mb] = await Promise.all([
        window.electronAPI.getDashboardStats(),
        window.electronAPI.getRecentActivities(10),
        window.electronAPI.getMostBorrowed(5),
      ]);
      setStats(s);
      setActivities(a);
      setMostBorrowed(mb);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    {
      title: 'Book Titles',
      value: stats?.totalTitles ?? 0,
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      tab: 'books',
    },
    {
      title: 'Physical Copies',
      value: stats?.totalCopies ?? 0,
      icon: Copy,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      tab: 'books',
    },
    {
      title: 'Available Copies',
      value: stats?.availableCopies ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      tab: 'books',
    },
    {
      title: 'Currently Issued',
      value: stats?.issuedBooks ?? 0,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      tab: 'issue',
    },
    {
      title: 'Overdue Books',
      value: stats?.overdueBooks ?? 0,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      tab: 'return',
    },
    {
      title: 'Active Students',
      value: stats?.totalStudents ?? 0,
      icon: GraduationCap,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      tab: 'students',
    },
    {
      title: 'Teachers & Faculty',
      value: stats?.totalTeachers ?? 0,
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      tab: 'teachers',
    },
    {
      title: 'Pending Fines',
      value: `${currency}${Number(stats?.pendingFinesAmount ?? 0).toFixed(2)}`,
      icon: Coins,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      tab: 'fines',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {college?.libraryName || 'College Library'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              Offline System Active
            </span>
          </div>
          <p className="text-xs text-slate-300">
            {college?.name} &bull; {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('issue')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Issue Book (Ctrl+I)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('return')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Return Book (Ctrl+R)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('books')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Book (Ctrl+B)</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            title="Refresh Statistics"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(c.tab)}
              className={`p-4 rounded-2xl bg-slate-900 border ${c.border} text-left hover:bg-slate-800/80 transition group relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition" />
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{c.value}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{c.title}</div>
            </button>
          );
        })}
      </div>

      {/* Bottom Grid: Most Borrowed & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Borrowed Books */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <BookmarkCheck className="w-4 h-4 text-blue-400" />
              <span>Most Borrowed Titles</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              View Full Report
            </button>
          </div>

          <div className="space-y-2.5">
            {mostBorrowed.length > 0 ? (
              mostBorrowed.map((b, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">{b.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-[11px] whitespace-nowrap">
                    {b.borrow_count} loans
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No borrowing history recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Live Activity Logs */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Recent Library Transactions & Activities</span>
            </h3>
            <span className="text-[11px] text-slate-500">Live Audit Trail</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between text-xs gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{act.details}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Action: {act.action}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex-shrink-0 ${
                      act.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : act.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {act.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500">
                No recent transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
