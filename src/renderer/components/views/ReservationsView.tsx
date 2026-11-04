import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Search, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Reservation, BorrowerType, Book as BookType } from '../../../shared/types';

export const ReservationsView: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [booksList, setBooksList] = useState<BookType[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [borrowerType, setBorrowerType] = useState<BorrowerType>('student');
  const [borrowerId, setBorrowerId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getReservations({ status, search });
      setReservations(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, [status, search]);

  const handleOpenModal = async () => {
    try {
      const books = await window.electronAPI.getBooks();
      setBooksList(books);
      if (books.length > 0) setSelectedBookId(books[0].id);
      setShowModal(true);
    } catch (e) {}
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedBookId || !borrowerId.trim()) {
      setModalError('Please select a book and enter patron ID.');
      return;
    }

    try {
      const res = await window.electronAPI.createReservation({
        bookId: selectedBookId,
        borrowerType,
        borrowerIdentifier: borrowerId.trim(),
      });

      if (res.success) {
        setShowModal(false);
        setBorrowerId('');
        loadReservations();
      } else {
        setModalError(res.error || 'Failed to create reservation.');
      }
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm('Cancel this book reservation?')) {
      const res = await window.electronAPI.cancelReservation(id);
      if (res.success) {
        loadReservations();
      } else {
        alert(res.error || 'Failed to cancel reservation.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-amber-500" />
            <span>Book Reservations Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage patrons waiting for currently checked-out or reserved books.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Borrower</th>
                <th className="py-3 px-4">Queue Position</th>
                <th className="py-3 px-4">Date Reserved</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reservations.length > 0 ? (
                reservations.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white text-sm">{r.bookTitle}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {r.borrowerName} ({r.borrowerIdentifier})
                    </td>
                    <td className="py-3 px-4">
                      <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400">
                        #{r.queuePosition}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.reservationDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.expiryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          r.status === 'ready_for_pickup'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'waiting'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'waiting' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(r.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[11px] font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Loading reservations...' : 'No active book reservations in queue.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RESERVATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Place Book Reservation</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Book</label>
                <select
                  value={selectedBookId}
                  onChange={e => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {booksList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} (Available: {b.availableCopies}/{b.totalCopies})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Borrower Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBorrowerType('student')}
                    className={`py-2 rounded-lg font-semibold border ${
                      borrowerType === 'student' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrowerType('teacher')}
                    className={`py-2 rounded-lg font-semibold border ${
                      borrowerType === 'teacher' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Faculty
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {borrowerType === 'student' ? 'Admission Number' : 'Employee ID'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={borrowerType === 'student' ? 'e.g. ADM-2026-0042' : 'e.g. EMP-1042'}
                  value={borrowerId}
                  onChange={e => setBorrowerId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
