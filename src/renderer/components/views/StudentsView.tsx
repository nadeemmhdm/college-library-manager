import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Printer,
  Archive,
  Upload,
  Download,
  X,
  AlertCircle,
  Phone,
  Mail,
  UserCheck,
  Edit3,
} from 'lucide-react';
import Papa from 'papaparse';
import { Student, CollegeProfile } from '../../../shared/types';
import { printStudentLibraryCard } from '../../utils/printUtils';

interface StudentsViewProps {
  college: CollegeProfile | null;
}

export const StudentsView: React.FC<StudentsViewProps> = ({ college }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active');
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newStudent, setNewStudent] = useState({
    admissionNumber: '',
    fullName: '',
    department: 'Computer Science',
    academicYear: '2026-2027',
    semester: '1st Semester',
    phone: '',
    email: '',
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getStudents({ search, department, status });
      setStudents(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [search, department, status]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newStudent.admissionNumber.trim() || !newStudent.fullName.trim()) {
      setModalError('Admission Number and Full Name are required.');
      return;
    }

    try {
      const res = await window.electronAPI.createStudent(newStudent);
      if (res.success) {
        setShowAddModal(false);
        setNewStudent({
          admissionNumber: '',
          fullName: '',
          department: 'Computer Science',
          academicYear: '2026-2027',
          semester: '1st Semester',
          phone: '',
          email: '',
        });
        loadStudents();
      } else {
        setModalError(res.error || 'Failed to register student.');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setModalError(null);

    try {
      const res = await window.electronAPI.updateStudent(editingStudent.id, editingStudent);
      if (res.success) {
        setEditingStudent(null);
        loadStudents();
      } else {
        setModalError(res.error || 'Failed to update student.');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (confirm('Archive this student record? This student will no longer be eligible for book issues.')) {
      const res = await window.electronAPI.archiveStudent(id);
      if (res.success) {
        loadStudents();
      } else {
        alert(res.error || 'Cannot archive student.');
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
          admissionNumber: r.AdmissionNo || r.admissionNumber || '',
          fullName: r.Name || r.fullName || '',
          department: r.Department || r.department || 'General',
          academicYear: r.AcademicYear || r.academicYear || '2026-2027',
          semester: r.Semester || r.semester || '1st Semester',
          phone: r.Phone || r.phone || '',
          email: r.Email || r.email || '',
        }));

        try {
          const res = await window.electronAPI.bulkImportStudents(rows);
          alert(`Successfully imported ${res.imported} students. Errors: ${res.errors.length}`);
          loadStudents();
        } catch (err: any) {
          alert('Bulk import error: ' + err.message);
        }
      },
    });
  };

  const handleCsvExport = () => {
    const csv = Papa.unparse(
      students.map(s => ({
        AdmissionNumber: s.admissionNumber,
        FullName: s.fullName,
        Department: s.department,
        AcademicYear: s.academicYear,
        Semester: s.semester,
        Phone: s.phone,
        Email: s.email,
        Status: s.status,
        CurrentIssues: s.currentIssuesCount,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Students_${new Date().toISOString().split('T')[0]}.csv`;
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
              placeholder="Search by student name, admission no, email..."
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
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Admission No</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Academic Year & Sem</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Active Issues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.length > 0 ? (
                students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white text-sm">{s.fullName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-400">{s.admissionNumber}</td>
                    <td className="py-3 px-4 text-slate-300">{s.department}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {s.academicYear} &bull; {s.semester}
                    </td>
                    <td className="py-3 px-4 text-slate-400 space-y-0.5">
                      {s.phone && (
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{s.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          s.currentIssuesCount > 0
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.currentIssuesCount} Books
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => printStudentLibraryCard(s, college)}
                          title="Print Library Card"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3 text-blue-400" />
                          <span>ID Card</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent(s);
                            setModalError(null);
                          }}
                          title="Edit Student"
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {s.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleArchive(s.id)}
                            title="Archive Student"
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
                    {loading ? 'Loading student records...' : 'No student records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-white">Register Student</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={newStudent.fullName}
                  onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Admission Number (Roll No / ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2026-0042"
                  value={newStudent.admissionNumber}
                  onChange={e => setNewStudent({ ...newStudent, admissionNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newStudent.department}
                    onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
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
                  <label className="block font-semibold text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newStudent.academicYear}
                    onChange={e => setNewStudent({ ...newStudent, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    value={newStudent.semester}
                    onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newStudent.phone}
                    onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="student@college.edu"
                  value={newStudent.email}
                  onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
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
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-white">Edit Student Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Admission Number *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.admissionNumber}
                  onChange={e => setEditingStudent({ ...editingStudent, admissionNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={editingStudent.department}
                    onChange={e => setEditingStudent({ ...editingStudent, department: e.target.value })}
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
                  <label className="block font-semibold text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={editingStudent.academicYear}
                    onChange={e => setEditingStudent({ ...editingStudent, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Semester</label>
                  <input
                    type="text"
                    value={editingStudent.semester}
                    onChange={e => setEditingStudent({ ...editingStudent, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStudent.phone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingStudent.email || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/20"
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
