import React, { useState } from 'react';
import {
  Clock,
  Search,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Printer,
  AlertCircle,
  Barcode,
  Calendar,
} from 'lucide-react';
import { BorrowerType, BookCopy, Student, Teacher, BookTransaction, CollegeProfile } from '../../../shared/types';
import { printIssueReceipt } from '../../utils/printUtils';

interface IssueViewProps {
  college: CollegeProfile | null;
  currency?: string;
}

export const IssueView: React.FC<IssueViewProps> = ({ college, currency = '₹' }) => {
  const [borrowerType, setBorrowerType] = useState<BorrowerType>('student');
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [borrowerData, setBorrowerData] = useState<Student | Teacher | null>(null);

  const [copyIdentifier, setCopyIdentifier] = useState('');
  const [copyData, setCopyData] = useState<BookCopy | null>(null);

  const [durationDays, setDurationDays] = useState(14);
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTransaction, setSuccessTransaction] = useState<BookTransaction | null>(null);

  // Search Patron
  const handleSearchBorrower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerQuery.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (borrowerType === 'student') {
        const students = await window.electronAPI.getStudents({ search: borrowerQuery.trim() });
        if (students.length > 0) {
          setBorrowerData(students[0]);
        } else {
          setError(`No student found matching '${borrowerQuery}'.`);
          setBorrowerData(null);
        }
      } else {
        const teachers = await window.electronAPI.getTeachers({ search: borrowerQuery.trim() });
        if (teachers.length > 0) {
          setBorrowerData(teachers[0]);
        } else {
          setError(`No faculty member found matching '${borrowerQuery}'.`);
          setBorrowerData(null);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search Book Copy (Scan barcode, accession no, or library ID)
  const handleSearchCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyIdentifier.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const copy = await window.electronAPI.findCopy(copyIdentifier.trim());
      if (copy) {
        if (copy.status !== 'available') {
          setError(`Copy ${copy.accessionNumber} (${copy.libraryId}) is already marked as '${copy.status}'.`);
          setCopyData(null);
        } else {
          setCopyData(copy);
        }
      } else {
        setError(`No book copy registered with ID / Barcode '${copyIdentifier}'.`);
        setCopyData(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm Issue
  const handleConfirmIssue = async () => {
    if (!borrowerData || !copyData) {
      setError('Both patron and book copy must be identified.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const borrowerId =
        borrowerType === 'student'
          ? (borrowerData as Student).admissionNumber
          : (borrowerData as Teacher).employeeId;

      const res = await window.electronAPI.issueBook({
        copyIdentifier: copyData.accessionNumber,
        borrowerType,
        borrowerIdentifier: borrowerId,
        customDurationDays: durationDays,
        remarks,
      });

      if (res.success && res.transaction) {
        setSuccessTransaction(res.transaction);
        // Reset forms
        setCopyData(null);
        setCopyIdentifier('');
        setRemarks('');
      } else {
        setError(res.error || 'Failed to issue book.');
      }
    } catch (err: any) {
      setError(err.message || 'Issue error.');
    } finally {
      setLoading(false);
    }
  };

  const dueDatePreview = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>Circulation & Book Issue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan borrower card and book barcode/ID to issue book loans.
          </p>
        </div>

        {/* Borrower Type Selector */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setBorrowerType('student');
              setBorrowerData(null);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              borrowerType === 'student' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Student Loan
          </button>
          <button
            type="button"
            onClick={() => {
              setBorrowerType('teacher');
              setBorrowerData(null);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              borrowerType === 'teacher' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Faculty Loan
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Transaction Banner */}
      {successTransaction && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Book Successfully Issued!</span>
            </div>
            <div className="text-xs text-emerald-200">
              '{successTransaction.bookTitle}' issued to {successTransaction.borrowerName} ({successTransaction.borrowerIdentifier}). Due date: {new Date(successTransaction.dueDate).toLocaleDateString()}.
            </div>
          </div>
          <button
            type="button"
            onClick={() => printIssueReceipt(successTransaction, college, currency)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Issue Slip</span>
          </button>
        </div>
      )}

      {/* Two-step identification grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Step 1: Borrower Search */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>1. Scan or Identify {borrowerType === 'student' ? 'Student' : 'Faculty'}</span>
          </div>

          <form onSubmit={handleSearchBorrower} className="flex space-x-2">
            <input
              type="text"
              autoFocus
              placeholder={borrowerType === 'student' ? 'Scan Admission No / Name' : 'Scan Employee ID / Name'}
              value={borrowerQuery}
              onChange={e => setBorrowerQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {borrowerData ? (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm">{borrowerData.fullName}</div>
              <div className="text-slate-400">
                ID:{' '}
                <span className="font-mono text-blue-400 font-semibold">
                  {borrowerType === 'student'
                    ? (borrowerData as Student).admissionNumber
                    : (borrowerData as Teacher).employeeId}
                </span>{' '}
                &bull; Dept: {borrowerData.department}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Current Issued Books:</span>
                <span className="font-bold text-amber-400">{borrowerData.currentIssuesCount} Books</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">Scan ID card barcode or type identifier above.</div>
          )}
        </div>

        {/* Step 2: Book Copy Search */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span>2. Scan Book Barcode or Library ID</span>
          </div>

          <form onSubmit={handleSearchCopy} className="flex space-x-2">
            <input
              type="text"
              placeholder="Scan Barcode / Acc No (ACC-000001) / LIB-ID"
              value={copyIdentifier}
              onChange={e => setCopyIdentifier(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {copyData ? (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm">{copyData.bookTitle}</div>
              <div className="text-slate-400">by {copyData.author}</div>
              <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-300">
                <span>Acc: {copyData.accessionNumber}</span>
                <span>&bull;</span>
                <span className="text-emerald-400">ID: {copyData.libraryId}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Location: {copyData.rackNumber} / {copyData.shelfLocation}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">Scan book barcode sticker or write Library ID.</div>
          )}
        </div>
      </div>

      {/* Confirmation Card */}
      {borrowerData && copyData && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <div className="font-bold text-white text-sm">Loan Parameters & Confirmation</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Issue Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={e => setDurationDays(parseInt(e.target.value, 10) || 14)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Due Date Calculated</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dueDatePreview}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Reference only"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmIssue}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xl shadow-blue-600/20 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Processing Transaction...' : 'Confirm Book Issue'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
