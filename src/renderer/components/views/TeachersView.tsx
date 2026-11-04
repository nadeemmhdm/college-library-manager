import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Archive,
  Upload,
  Download,
  X,
  AlertCircle,
  Phone,
  Mail,
  Briefcase,
  Edit3,
} from 'lucide-react';
import Papa from 'papaparse';
import { Teacher, CollegeProfile } from '../../../shared/types';

interface TeachersViewProps {
  college: CollegeProfile | null;
}

export const TeachersView: React.FC<TeachersViewProps> = ({ college }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newTeacher, setNewTeacher] = useState({
    employeeId: '',
    fullName: '',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    phone: '',
    email: '',
  });

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getTeachers({ search, department, status });
      setTeachers(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [search, department, status]);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newTeacher.employeeId.trim() || !newTeacher.fullName.trim()) {
      setModalError('Employee ID and Full Name are required.');
      return;
    }

    try {
      const res = await window.electronAPI.createTeacher(newTeacher);
      if (res.success) {
        setShowAddModal(false);
        setNewTeacher({
          employeeId: '',
          fullName: '',
          department: 'Computer Science',
          designation: 'Assistant Professor',
          phone: '',
          email: '',
        });
        loadTeachers();
      } else {
        setModalError(res.error || 'Failed to register faculty member.');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setModalError(null);

    try {
      const res = await window.electronAPI.updateTeacher(editingTeacher.id, editingTeacher);
      if (res.success) {
        setEditingTeacher(null);
        loadTeachers();
      } else {
        setModalError(res.error || 'Failed to update faculty member.');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (confirm('Archive this faculty record? They will no longer be eligible for book issues.')) {
      const res = await window.electronAPI.archiveTeacher(id);
      if (res.success) {
        loadTeachers();
      } else {
        alert(res.error || 'Cannot archive faculty.');
      }
    }
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        const rows = results.data.map((r: any) => ({
          employeeId: r.EmployeeID || r.employeeId || '',
          fullName: r.Name || r.fullName || '',
          department: r.Department || r.department || 'General',
          designation: r.Designation || r.designation || 'Faculty',
          phone: r.Phone || r.phone || '',
          email: r.Email || r.email || '',
        }));

        try {
          const res = await window.electronAPI.bulkImportTeachers(rows);
          alert(`Successfully imported ${res.imported} faculty members. Errors: ${res.errors.length}`);
          loadTeachers();
        } catch (err: any) {
          alert('Bulk import error: ' + err.message);
        }
      },
    });
  };

  const handleCsvExport = () => {
    const csv = Papa.unparse(
      teachers.map(t => ({
        EmployeeID: t.employeeId,
        FullName: t.fullName,
        Department: t.department,
        Designation: t.designation,
        Phone: t.phone,
        Email: t.email,
        Status: t.status,
        CurrentIssues: t.currentIssuesCount,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Faculty_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const departments = [
    'all',
    'Computer Science',
    'Information Technology',
    'Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Sciences & Humanities',
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search faculty by name, employee ID, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              {departments.map(d => (
                <option key={d} value={d} className="bg-slate-900">
                  {d === 'all' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleCsvExport}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Faculty Name</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Active Issues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {teachers.length > 0 ? (
                teachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white text-sm">{t.fullName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-purple-400">{t.employeeId}</td>
                    <td className="py-3 px-4 text-slate-300">{t.department}</td>
                    <td className="py-3 px-4 text-slate-400">{t.designation}</td>
                    <td className="py-3 px-4 text-slate-400 space-y-0.5">
                      {t.phone && (
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{t.phone}</span>
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{t.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          t.currentIssuesCount > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.currentIssuesCount} Books
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacher(t);
                            setModalError(null);
                          }}
                          title="Edit Faculty"
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-purple-400 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {t.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleArchive(t.id)}
                            title="Archive Record"
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Loading faculty records...' : 'No faculty records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD FACULTY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-bold text-white">Register Faculty Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Faculty Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. David Miller"
                  value={newTeacher.fullName}
                  onChange={e => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-1042"
                  value={newTeacher.employeeId}
                  onChange={e => setNewTeacher({ ...newTeacher, employeeId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newTeacher.department}
                    onChange={e => setNewTeacher({ ...newTeacher, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {departments.filter(d => d !== 'all').map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Professor"
                    value={newTeacher.designation}
                    onChange={e => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newTeacher.phone}
                    onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="faculty@college.edu"
                    value={newTeacher.email}
                    onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20"
                >
                  Register Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-purple-500" />
                <h3 className="text-base font-bold text-white">Edit Faculty Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTeacher} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Faculty Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.fullName}
                  onChange={e => setEditingTeacher({ ...editingTeacher, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={editingTeacher.employeeId}
                  onChange={e => setEditingTeacher({ ...editingTeacher, employeeId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={editingTeacher.department}
                    onChange={e => setEditingTeacher({ ...editingTeacher, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {departments.filter(d => d !== 'all').map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editingTeacher.designation}
                    onChange={e => setEditingTeacher({ ...editingTeacher, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingTeacher.phone || ''}
                    onChange={e => setEditingTeacher({ ...editingTeacher, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingTeacher.email || ''}
                    onChange={e => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
