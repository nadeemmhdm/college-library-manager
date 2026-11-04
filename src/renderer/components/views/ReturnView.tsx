import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Search,
  BookOpen,
  User,
  AlertTriangle,
  Printer,
  CheckCircle2,
  RefreshCw,
  Coins,
  ShieldCheck,
  XCircle,
  X,
} from 'lucide-react';
import { BookTransaction, CollegeProfile } from '../../../shared/types';
import { printReturnReceipt } from '../../utils/printUtils';

interface ReturnViewProps {
  college: CollegeProfile | null;
  currency?: string;
}

export const ReturnView: React.FC<ReturnViewProps> = ({ college, currency = '₹' }) => {
  const [identifier, setIdentifier] = useState('');
  const [activeLoans, setActiveLoans] = useState<BookTransaction[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<BookTransaction | null>(null);
  const [conditionNotes, setConditionNotes] = useState('Good');
  const [waiveFine, setWaiveFine] = useState(false);
  const [finePaid, setFinePaid] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    transaction: BookTransaction;
    receiptNumber?: string;
  } | null>(null);

  // Lost / Damaged Modal
  const [lostDamagedLoan, setLostDamagedLoan] = useState<BookTransaction | null>(null);
  const [lostDamagedStatus, setLostDamagedStatus] = useState<'lost' | 'damaged'>('lost');
  const [lostFineAmount, setLostFineAmount] = useState<number>(100);
  const [lostNotes, setLostNotes] = useState<string>('');

  // Load active loans list
  const loadActiveLoans = async () => {
    try {
      const loans = await window.electronAPI.getActiveTransactions();
      setActiveLoans(loans);
    } catch (e) {}
  };

  useEffect(() => {
    loadActiveLoans();
  }, []);

  // Scan or find loan by book identifier
  const handleScanBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setError(null);
    setSuccessInfo(null);
    const cleaned = identifier.trim().toLowerCase();

    const match = activeLoans.find(
      l =>
        l.accessionNumber.toLowerCase() === cleaned ||
        l.libraryId.toLowerCase() === cleaned ||
        l.borrowerIdentifier.toLowerCase() === cleaned
    );

    if (match) {
      setSelectedLoan(match);
      setFinePaid(match.fineCalculated);
    } else {
      setError(`No active issue found for barcode / ID '${identifier}'.`);
      setSelectedLoan(null);
    }
  };

  // Confirm Return
  const handleConfirmReturn = async () => {
    if (!selectedLoan) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.returnBook({
        copyIdentifier: selectedLoan.accessionNumber,
        conditionNotes,
        waiveFine,
        finePaid: waiveFine ? 0 : finePaid,
      });

      if (res.success) {
        setSuccessInfo({
          transaction: selectedLoan,
          receiptNumber: res.receiptNumber,
        });
        setSelectedLoan(null);
        setIdentifier('');
        loadActiveLoans();
      } else {
        setError(res.error || 'Failed to process book return.');
      }
    } catch (err: any) {
      setError(err.message || 'Return error.');
    } finally {
      setLoading(false);
    }
  };

  // Renew Loan
  const handleRenew = async (transactionId: string) => {
    try {
      const res = await window.electronAPI.renewBook(transactionId);
      if (res.success) {
        alert(`Loan successfully renewed until ${new Date(res.newDueDate!).toLocaleDateString()}`);
        loadActiveLoans();
        if (selectedLoan?.id === transactionId) {
          setSelectedLoan(null);
        }
      } else {
        alert(res.error || 'Cannot renew loan.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Mark Book as Lost or Damaged
  const handleMarkLostOrDamaged = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostDamagedLoan) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.markLostOrDamaged({
        copyId: lostDamagedLoan.copyId,
        status: lostDamagedStatus,
        fineAmount: Number(lostFineAmount) || 0,
        notes: lostNotes,
      });

      if (res.success) {
        alert(
          `Book copy ${lostDamagedLoan.accessionNumber} marked as ${lostDamagedStatus.toUpperCase()}.${
            lostFineAmount > 0 ? ` Fine of ${currency}${lostFineAmount} assessed.` : ''
          }`
        );
        if (selectedLoan?.id === lostDamagedLoan.id) {
          setSelectedLoan(null);
        }
        setLostDamagedLoan(null);
        setLostNotes('');
        loadActiveLoans();
      } else {
        alert(res.error || 'Failed to update copy status.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Book Return & Check-in</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan returned book copy to assess overdue fines and update library inventory.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Return Banner */}
      {successInfo && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300">
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Book Successfully Checked In!</span>
            </div>
            <div className="text-xs text-emerald-200">
              '{successInfo.transaction.bookTitle}' checked back in from {successInfo.transaction.borrowerName}. Stock available count incremented.
            </div>
          </div>
          <button
            type="button"
            onClick={() => printReturnReceipt(successInfo.transaction, college, null, currency)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Return Slip</span>
          </button>
        </div>
      )}

      {/* Return Scanner Box */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-xl mx-auto">
        <div className="text-xs font-bold text-white uppercase tracking-wider">Scan or Enter Book to Return</div>
        <form onSubmit={handleScanBook} className="flex space-x-2">
          <input
            type="text"
            autoFocus
            placeholder="Scan Barcode / Acc No (ACC-000001) / LIB-ID"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
          >
            Find Loan
          </button>
        </form>
      </div>

      {/* Return Details Card */}
      {selectedLoan && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 max-w-2xl mx-auto text-xs">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-white text-base">{selectedLoan.bookTitle}</div>
              <div className="text-slate-400 text-xs">
                Acc No: <span className="font-mono text-slate-200">{selectedLoan.accessionNumber}</span> &bull; Lib ID:{' '}
                <span className="font-mono text-emerald-400">{selectedLoan.libraryId}</span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                selectedLoan.overdueDays > 0
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {selectedLoan.overdueDays > 0 ? `${selectedLoan.overdueDays} Days Overdue` : 'On Time'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[11px]">Borrower:</span>
              <span className="font-bold text-white text-xs">{selectedLoan.borrowerName}</span>
              <span className="text-slate-400 block text-[11px]">
                {selectedLoan.borrowerIdentifier} ({selectedLoan.borrowerType.toUpperCase()})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Due Date:</span>
              <span className="font-bold text-slate-200 text-xs">
                {new Date(selectedLoan.dueDate).toLocaleDateString()}
              </span>
              <span className="text-slate-400 block text-[11px]">
                Loaned: {new Date(selectedLoan.issueDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Overdue Fine Panel */}
          {selectedLoan.overdueDays > 0 && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
              <div className="flex items-center justify-between text-red-400 font-bold">
                <div className="flex items-center space-x-1.5">
                  <Coins className="w-4 h-4" />
                  <span>Calculated Overdue Fine:</span>
                </div>
                <span className="text-base font-black">
                  {currency}
                  {selectedLoan.fineCalculated.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiveFine}
                    onChange={e => setWaiveFine(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-0"
                  />
                  <span>Waive fine entirely (Librarian discretion)</span>
                </label>

                {!waiveFine && (
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-300">Amount Paid:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={selectedLoan.fineCalculated}
                      value={finePaid}
                      onChange={e => setFinePaid(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-white text-right font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">Book Condition on Return</label>
            <input
              type="text"
              value={conditionNotes}
              onChange={e => setConditionNotes(e.target.value)}
              placeholder="e.g. Good, Minor wear, Pages intact"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleRenew(selectedLoan.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renew</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLostDamagedLoan(selectedLoan);
                  setLostDamagedStatus('lost');
                  setLostFineAmount(150);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold flex items-center space-x-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Mark Lost / Damaged</span>
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmReturn}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Confirm Book Return'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Borrowed Books Queue Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl mt-8">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="font-bold text-white text-sm">All Currently Issued Books ({activeLoans.length})</div>
          <button
            type="button"
            onClick={loadActiveLoans}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Acc No & Lib ID</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeLoans.length > 0 ? (
                activeLoans.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white text-sm">{l.bookTitle}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {l.accessionNumber} &bull; <span className="text-blue-400">{l.libraryId}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {l.borrowerName} ({l.borrowerIdentifier})
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(l.issueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          l.overdueDays > 0
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {l.overdueDays > 0 ? `${l.overdueDays}d Overdue` : 'Active Loan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLoan(l);
                            setFinePaid(l.fineCalculated);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px]"
                        >
                          Check In
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLostDamagedLoan(l);
                            setLostDamagedStatus('lost');
                            setLostFineAmount(150);
                          }}
                          title="Report Lost / Damaged"
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No books are currently issued out.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MARK LOST / DAMAGED MODAL */}
      {lostDamagedLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white">Report Copy as Lost or Damaged</h3>
              </div>
              <button
                type="button"
                onClick={() => setLostDamagedLoan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkLostOrDamaged} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white text-sm">{lostDamagedLoan.bookTitle}</div>
                <div className="text-slate-400">
                  Acc No: <span className="font-mono text-slate-200">{lostDamagedLoan.accessionNumber}</span> &bull; Borrower:{' '}
                  <span className="text-white font-medium">{lostDamagedLoan.borrowerName}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Issue Condition Status *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLostDamagedStatus('lost')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      lostDamagedStatus === 'lost'
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Lost
                  </button>
                  <button
                    type="button"
                    onClick={() => setLostDamagedStatus('damaged')}
                    className={`p-3 rounded-xl border text-center font-bold transition ${
                      lostDamagedStatus === 'damaged'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Damaged
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Replacement / Damage Penalty Fee ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={lostFineAmount}
                  onChange={e => setLostFineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This fee will be billed to {lostDamagedLoan.borrowerName} and recorded under Library Fines.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Incident Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={lostNotes}
                  onChange={e => setLostNotes(e.target.value)}
                  placeholder="e.g. Lost during transit, missing pages, cover torn..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setLostDamagedLoan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/20"
                >
                  {loading ? 'Processing...' : 'Confirm Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
