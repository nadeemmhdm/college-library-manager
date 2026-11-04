import React, { useState, useEffect } from 'react';
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
  Layers,
  ArrowRight,
  User,
  GraduationCap,
  Users,
} from 'lucide-react';
import {
  BorrowerType,
  BookCopy,
  Student,
  Teacher,
  BookTransaction,
  CollegeProfile,
  Book,
} from '../../../shared/types';
import { printIssueReceipt } from '../../utils/printUtils';

interface IssueViewProps {
  college: CollegeProfile | null;
  currency?: string;
  preselectedBorrower?: { type: BorrowerType; data: Student | Teacher } | null;
}

export const IssueView: React.FC<IssueViewProps> = ({
  college,
  currency = '₹',
  preselectedBorrower = null,
}) => {
  const [borrowerType, setBorrowerType] = useState<BorrowerType>(
    preselectedBorrower ? preselectedBorrower.type : 'student'
  );
  const [borrowerQuery, setBorrowerQuery] = useState('');
  const [borrowerCandidates, setBorrowerCandidates] = useState<Array<Student | Teacher>>([]);
  const [borrowerData, setBorrowerData] = useState<Student | Teacher | null>(
    preselectedBorrower ? preselectedBorrower.data : null
  );

  const [bookQuery, setBookQuery] = useState('');
  const [copyData, setCopyData] = useState<BookCopy | null>(null);
  const [availableCopiesCandidates, setAvailableCopiesCandidates] = useState<BookCopy[]>([]);

  const [durationDays, setDurationDays] = useState(14);
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTransaction, setSuccessTransaction] = useState<BookTransaction | null>(null);

  // Load default issue duration from library config
  useEffect(() => {
    window.electronAPI.getLibraryConfig().then(cfg => {
      if (cfg && cfg.defaultIssueDurationDays) {
        setDurationDays(cfg.defaultIssueDurationDays);
      }
    });
  }, []);

  // Update when preselectedBorrower changes
  useEffect(() => {
    if (preselectedBorrower) {
      setBorrowerType(preselectedBorrower.type);
      setBorrowerData(preselectedBorrower.data);
    }
  }, [preselectedBorrower]);

  // Search Patrons (Live query or manual search)
  const handleSearchBorrower = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = borrowerQuery.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setBorrowerCandidates([]);
    try {
      if (borrowerType === 'student') {
        const students = await window.electronAPI.getStudents({ search: query });
        if (students.length === 1) {
          setBorrowerData(students[0]);
          setBorrowerCandidates([]);
        } else if (students.length > 1) {
          setBorrowerCandidates(students);
          setBorrowerData(null);
        } else {
          setError(`No student found matching "${query}". Try searching by Name, Admission Number, or Phone.`);
          setBorrowerData(null);
        }
      } else {
        const teachers = await window.electronAPI.getTeachers({ search: query });
        if (teachers.length === 1) {
          setBorrowerData(teachers[0]);
          setBorrowerCandidates([]);
        } else if (teachers.length > 1) {
          setBorrowerCandidates(teachers);
          setBorrowerData(null);
        } else {
          setError(`No faculty member found matching "${query}". Try searching by Name, Employee ID, or Phone.`);
          setBorrowerData(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error searching patron.');
    } finally {
      setLoading(false);
    }
  };

  // Search Book Copy (Barcode, Accession No, Library ID, or Book Title)
  const handleSearchBook = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = bookQuery.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setCopyData(null);
    setAvailableCopiesCandidates([]);
    try {
      // 1. Direct copy lookup first (Barcode, Acc No, Library ID)
      const directCopy = await window.electronAPI.findCopy(query);
      if (directCopy) {
        if (directCopy.status !== 'available') {
          setError(`Copy ${directCopy.accessionNumber} (${directCopy.libraryId}) is already marked as "${directCopy.status}".`);
        } else {
          setCopyData(directCopy);
        }
        setLoading(false);
        return;
      }

      // 2. Fallback: Search in Books catalog by Title / Author / ISBN
      const books = await window.electronAPI.getBooks({ search: query });
      if (books.length > 0) {
        // Collect copies from matching books
        const allCopies: BookCopy[] = [];
        for (const b of books.slice(0, 3)) {
          const copies = await window.electronAPI.getBookCopies(b.id);
          const available = copies.filter(c => c.status === 'available');
          allCopies.push(...available);
        }

        if (allCopies.length === 1) {
          setCopyData(allCopies[0]);
        } else if (allCopies.length > 1) {
          setAvailableCopiesCandidates(allCopies);
        } else {
          setError(`Book found ("${books[0].title}"), but has 0 available copies currently in library.`);
        }
      } else {
        setError(`No book copy or catalog record found matching "${query}". Check accession number or scan barcode.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error searching book copy.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Book Issue
  const handleConfirmIssue = async () => {
    if (!borrowerData) {
      setError('Please select a student or faculty member.');
      return;
    }
    if (!copyData) {
      setError('Please select an available book copy to issue.');
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
        // Refresh borrower data active count
        if (borrowerType === 'student') {
          const updated = await window.electronAPI.findStudent(borrowerId);
          if (updated) setBorrowerData(updated);
        } else {
          const updated = await window.electronAPI.findTeacher(borrowerId);
          if (updated) setBorrowerData(updated);
        }
        // Reset copy form
        setCopyData(null);
        setBookQuery('');
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

  const dueDatePreview = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toLocaleDateString(
    undefined,
    { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span>Circulation & Book Issue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue books to students and faculty with instant barcode scanning and printed loan slips.
          </p>
        </div>

        {/* Borrower Type Selector Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setBorrowerType('student');
              setBorrowerData(null);
              setBorrowerCandidates([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 ${
              borrowerType === 'student'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Loan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBorrowerType('teacher');
              setBorrowerData(null);
              setBorrowerCandidates([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 ${
              borrowerType === 'teacher'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Faculty Loan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Transaction Banner */}
      {successTransaction && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-emerald-300 animate-in fade-in zoom-in-95 duration-200 shadow-xl">
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center space-x-2 text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Book Successfully Issued!</span>
            </div>
            <div className="text-xs text-emerald-200 leading-relaxed">
              <span className="font-semibold text-white">"{successTransaction.bookTitle}"</span> (Acc:{' '}
              <span className="font-mono text-emerald-300">{successTransaction.accessionNumber}</span>) issued to{' '}
              <span className="font-semibold text-white">{successTransaction.borrowerName}</span> (
              {successTransaction.borrowerIdentifier}). Due date:{' '}
              <span className="font-bold text-white">
                {new Date(successTransaction.dueDate).toLocaleDateString()}
              </span>
              .
            </div>
          </div>
          <button
            type="button"
            onClick={() => printIssueReceipt(successTransaction, college, currency)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Loan Slip</span>
          </button>
        </div>
      )}

      {/* Two-step identification grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Step 1: Borrower Search */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-white font-bold text-sm">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span>1. Identify {borrowerType === 'student' ? 'Student' : 'Faculty'}</span>
            </div>
            {borrowerData && (
              <button
                type="button"
                onClick={() => {
                  setBorrowerData(null);
                  setBorrowerQuery('');
                }}
                className="text-[10px] text-blue-400 hover:underline font-normal"
              >
                Change Patron
              </button>
            )}
          </div>

          {!borrowerData ? (
            <div className="space-y-3">
              <form onSubmit={handleSearchBorrower} className="flex space-x-2">
                <input
                  type="text"
                  autoFocus
                  placeholder={
                    borrowerType === 'student'
                      ? 'Type Name or Admission No (ADM-2026-0042)...'
                      : 'Type Name or Employee ID (FAC-0019)...'
                  }
                  value={borrowerQuery}
                  onChange={e => setBorrowerQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center space-x-1.5 active:scale-95 transition"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </form>

              {/* Multiple Candidate Match List */}
              {borrowerCandidates.length > 0 && (
                <div className="space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950/80 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                    Select matching patron ({borrowerCandidates.length}):
                  </div>
                  {borrowerCandidates.map(c => {
                    const id =
                      borrowerType === 'student'
                        ? (c as Student).admissionNumber
                        : (c as Teacher).employeeId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setBorrowerData(c);
                          setBorrowerCandidates([]);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/40 border border-transparent flex items-center justify-between text-xs text-slate-200 transition active:scale-95"
                      >
                        <div>
                          <div className="font-bold text-white">{c.fullName}</div>
                          <div className="text-[10px] text-slate-400">
                            {id} &bull; {c.department}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 font-mono text-amber-400">
                          {c.currentIssuesCount} active
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="text-center py-6 text-slate-500 text-xs">
                Scan patron card barcode or type name/ID above.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-base">{borrowerData.fullName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ID:{' '}
                    <span className="font-mono text-blue-400 font-bold">
                      {borrowerType === 'student'
                        ? (borrowerData as Student).admissionNumber
                        : (borrowerData as Teacher).employeeId}
                    </span>{' '}
                    &bull; {borrowerData.department}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  {borrowerType}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Current Issued Books:</span>
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {borrowerData.currentIssuesCount} Books
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Book Copy Search */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-white font-bold text-sm">
            <div className="flex items-center space-x-2">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span>2. Identify Book Copy</span>
            </div>
            {copyData && (
              <button
                type="button"
                onClick={() => {
                  setCopyData(null);
                  setBookQuery('');
                }}
                className="text-[10px] text-emerald-400 hover:underline font-normal"
              >
                Change Copy
              </button>
            )}
          </div>

          {!copyData ? (
            <div className="space-y-3">
              <form onSubmit={handleSearchBook} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Scan Barcode / Acc No (ACC-000001) / Title..."
                  value={bookQuery}
                  onChange={e => setBookQuery(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1.5 active:scale-95 transition"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Find</span>
                </button>
              </form>

              {/* Multiple Matching Copies List */}
              {availableCopiesCandidates.length > 0 && (
                <div className="space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950/80 max-h-48 overflow-y-auto">
                  <div className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                    Select physical copy to loan ({availableCopiesCandidates.length} available):
                  </div>
                  {availableCopiesCandidates.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCopyData(c);
                        setAvailableCopiesCandidates([]);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-transparent flex items-center justify-between text-xs text-slate-200 transition active:scale-95"
                    >
                      <div>
                        <div className="font-bold text-white">{c.bookTitle}</div>
                        <div className="text-[10px] text-slate-400">
                          Acc: <span className="font-mono text-emerald-400 font-bold">{c.accessionNumber}</span> &bull; {c.libraryId}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 font-mono text-slate-300">
                        {c.rackNumber || 'Rack'}/{c.shelfLocation || 'Shelf'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="text-center py-6 text-slate-500 text-xs">
                Scan barcode sticker with scanner or enter Accession Number.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-base">{copyData.bookTitle}</div>
                  <div className="text-xs text-slate-400 mt-0.5">by {copyData.author}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Available
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono">
                <span className="text-slate-400">Accession No:</span>
                <span className="font-bold text-emerald-400">{copyData.accessionNumber}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Location:</span>
                <span className="text-slate-200">
                  Rack {copyData.rackNumber || '-'}, Shelf {copyData.shelfLocation || '-'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Loan Parameters Card */}
      {borrowerData && copyData && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 text-xs shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="font-bold text-white text-sm">Loan Parameters & Final Confirmation</div>
            <div className="text-[11px] text-slate-400">Ready to record offline loan</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Issue Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={durationDays}
                onChange={e => setDurationDays(parseInt(e.target.value, 10) || 14)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Calculated Return Due Date</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{dueDatePreview}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Reference use, good condition"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Issue Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-slate-400 text-[11px]">
              Will issue <span className="text-white font-semibold">"{copyData.bookTitle}"</span> to{' '}
              <span className="text-white font-semibold">{borrowerData.fullName}</span>.
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmIssue}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xl shadow-blue-600/30 flex items-center space-x-2 active:scale-95 transition"
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
