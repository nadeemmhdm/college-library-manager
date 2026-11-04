import React, { useState, useEffect } from 'react';
import { Coins, Search, Filter, CheckCircle2, ShieldCheck, Printer, X, AlertCircle } from 'lucide-react';
import { FineRecord, CollegeProfile } from '../../../shared/types';

interface FinesViewProps {
  college: CollegeProfile | null;
  currency?: string;
}

export const FinesView: React.FC<FinesViewProps> = ({ college, currency = '₹' }) => {
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [status, setStatus] = useState<'all' | 'unpaid' | 'paid' | 'waived'>('unpaid');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Pay Modal
  const [selectedFine, setSelectedFine] = useState<FineRecord | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState('');

  // Waive Modal
  const [waiveFineItem, setWaiveFineItem] = useState<FineRecord | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  const loadFines = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getFines({ status, search });
      setFines(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFines();
  }, [status, search]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFine) return;

    try {
      const res = await window.electronAPI.payFine({
        fineId: selectedFine.id,
        amountToPay: payAmount,
        notes: payNotes,
      });

      if (res.success) {
        alert(`Payment recorded successfully! Receipt: ${res.receiptNumber}`);
        setSelectedFine(null);
        loadFines();
      } else {
        alert(res.error || 'Payment failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWaive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiveFineItem || !waiveReason.trim()) return;

    try {
      const res = await window.electronAPI.waiveFine({
        fineId: waiveFineItem.id,
        reason: waiveReason.trim(),
      });

      if (res.success) {
        alert('Fine successfully waived.');
        setWaiveFineItem(null);
        loadFines();
      } else {
        alert(res.error || 'Waiver failed.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-rose-500" />
            <span>Fines & Penalties Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Collect overdue fines, damaged book penalties, or issue waivers.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by patron or receipt #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
            />
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {(['unpaid', 'paid', 'waived', 'all'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-lg capitalize font-semibold ${
                  status === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Amount Assessed</th>
                <th className="py-3 px-4">Paid / Waived</th>
                <th className="py-3 px-4">Remaining Balance</th>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fines.length > 0 ? (
                fines.map(f => {
                  const balance = f.amount - (f.paidAmount + f.waivedAmount);
                  return (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{f.borrowerName}</div>
                        <div className="text-[11px] text-slate-400">
                          {f.borrowerIdentifier} ({f.borrowerType.toUpperCase()})
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-semibold text-slate-300">
                        {f.reason}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {currency}
                        {f.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {currency}
                        {f.paidAmount.toFixed(2)} / {currency}
                        {f.waivedAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-black text-rose-400">
                        {currency}
                        {balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{f.receiptNumber || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            f.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : f.status === 'waived'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {balance > 0 && (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFine(f);
                                setPayAmount(balance);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-[11px]"
                            >
                              Collect
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWaiveFineItem(f);
                                setWaiveReason('');
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-[11px]"
                            >
                              Waive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Loading fines...' : 'No fine records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECT PAYMENT MODAL */}
      {selectedFine && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Collect Fine Payment</h3>
              <button type="button" onClick={() => setSelectedFine(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <span className="text-slate-400 block mb-1">Patron:</span>
                <span className="font-bold text-white text-sm">
                  {selectedFine.borrowerName} ({selectedFine.borrowerIdentifier})
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount to Collect ({currency})</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={selectedFine.amount - (selectedFine.paidAmount + selectedFine.waivedAmount)}
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Payment Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Cash / UPI transaction note"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFine(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirm Payment & Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAIVE MODAL */}
      {waiveFineItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Waive Fine</h3>
              <button type="button" onClick={() => setWaiveFineItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWaive} className="space-y-4">
              <p className="text-slate-400">
                Are you sure you want to waive the fine of {currency}
                {(waiveFineItem.amount - (waiveFineItem.paidAmount + waiveFineItem.waivedAmount)).toFixed(2)} for{' '}
                <strong className="text-white">{waiveFineItem.borrowerName}</strong>?
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason for Waiver *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Medical emergency certificate provided"
                  value={waiveReason}
                  onChange={e => setWaiveReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaiveFineItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Confirm Waiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
