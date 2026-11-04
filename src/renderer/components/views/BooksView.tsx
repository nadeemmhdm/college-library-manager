import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Copy,
  Printer,
  Trash2,
  Edit,
  Upload,
  Download,
  Barcode,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import Papa from 'papaparse';
import { Book, BookCopy, IdType, CollegeProfile } from '../../../shared/types';
import { printBookBarcodeLabel } from '../../utils/printUtils';

interface BooksViewProps {
  college: CollegeProfile | null;
}

export const BooksView: React.FC<BooksViewProps> = ({ college }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedBookForCopies, setSelectedBookForCopies] = useState<Book | null>(null);
  const [copiesList, setCopiesList] = useState<BookCopy[]>([]);
  const [showCopiesModal, setShowCopiesModal] = useState(false);

  // Add Book Form State
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    edition: '1st Edition',
    publicationYear: new Date().getFullYear(),
    category: 'Computer Science',
    subject: '',
    language: 'English',
    description: '',
    rackNumber: 'Rack-A',
    shelfLocation: 'Shelf-1',
  });

  const [initialCopiesCount, setInitialCopiesCount] = useState(1);
  const [copyIdType, setCopyIdType] = useState<IdType>('auto_lib_id');
  const [customManualId, setCustomManualId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Load books
  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getBooks({ search, category });
      setBooks(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [search, category]);

  // Open Copies Modal
  const handleOpenCopies = async (book: Book) => {
    setSelectedBookForCopies(book);
    try {
      const res = await window.electronAPI.getBookById(book.id);
      if (res) {
        setCopiesList(res.copies);
        setShowCopiesModal(true);
      }
    } catch (e) {}
  };

  // Add new copy to existing book
  const handleAddExtraCopy = async () => {
    if (!selectedBookForCopies) return;
    try {
      const res = await window.electronAPI.addBookCopy({
        bookId: selectedBookForCopies.id,
        copyData: {
          idType: 'auto_lib_id',
        },
      });
      if (res.success && res.copy) {
        setCopiesList(prev => [...prev, res.copy!]);
        loadBooks();
      }
    } catch (e) {}
  };

  // Submit New Book
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newBook.title.trim() || !newBook.author.trim()) {
      setModalError('Title and Author are required.');
      return;
    }

    const copiesData = Array.from({ length: Math.max(1, initialCopiesCount) }).map((_, idx) => ({
      idType: copyIdType,
      barcode: copyIdType === 'barcode' ? newBook.isbn?.trim() : '',
      libraryId: copyIdType === 'manual_lib_id' && idx === 0 ? customManualId.trim() : undefined,
    }));

    try {
      const res = await window.electronAPI.createBook({
        bookData: newBook,
        copiesData,
      });

      if (res.success) {
        setShowAddModal(false);
        setNewBook({
          title: '',
          author: '',
          isbn: '',
          publisher: '',
          edition: '1st Edition',
          publicationYear: new Date().getFullYear(),
          category: 'Computer Science',
          subject: '',
          language: 'English',
          description: '',
          rackNumber: 'Rack-A',
          shelfLocation: 'Shelf-1',
        });
        loadBooks();
      } else {
        setModalError(res.error || 'Failed to create book.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error creating book.');
    }
  };

  // Submit Update Book
  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    setModalError(null);

    try {
      const res = await window.electronAPI.updateBook(editingBook.id, editingBook);
      if (res.success) {
        setEditingBook(null);
        loadBooks();
      } else {
        setModalError(res.error || 'Failed to update book.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Error updating book.');
    }
  };

  // Delete Book
  const handleDeleteBook = async (id: string) => {
    if (confirm('Are you sure you want to delete this book and its physical copies? This action cannot be undone.')) {
      const res = await window.electronAPI.deleteBook(id);
      if (res.success) {
        loadBooks();
      } else {
        alert(res.error || 'Cannot delete book.');
      }
    }
  };

  // Bulk CSV Import
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async results => {
        const rows = results.data.map((r: any) => ({
          title: r.Title || r.title || '',
          author: r.Author || r.author || '',
          isbn: r.ISBN || r.isbn || '',
          publisher: r.Publisher || r.publisher || '',
          edition: r.Edition || r.edition || '',
          publicationYear: r.Year || r.publicationYear || '',
          category: r.Category || r.category || 'General',
          rackNumber: r.Rack || r.rackNumber || '',
          shelfLocation: r.Shelf || r.shelfLocation || '',
          copiesCount: r.Copies || r.copiesCount || 1,
        }));

        try {
          const res = await window.electronAPI.bulkImportBooks(rows);
          alert(`Successfully imported ${res.imported} books. Errors: ${res.errors.length}`);
          loadBooks();
        } catch (err: any) {
          alert('Bulk import error: ' + err.message);
        }
      },
    });
  };

  // CSV Export
  const handleCsvExport = () => {
    const csv = Papa.unparse(
      books.map(b => ({
        Title: b.title,
        Author: b.author,
        ISBN: b.isbn,
        Publisher: b.publisher,
        Edition: b.edition,
        Year: b.publicationYear,
        Category: b.category,
        Rack: b.rackNumber,
        Shelf: b.shelfLocation,
        TotalCopies: b.totalCopies,
        AvailableCopies: b.availableCopies,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Books_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const categories = [
    'all',
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Mathematics',
    'Physics',
    'Literature',
    'General',
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
              placeholder="Search by title, author, ISBN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none capitalize"
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-slate-900">
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* CSV Import */}
          <label className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleCsvExport}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Add Book */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book (Ctrl+B)</span>
          </button>
        </div>
      </div>

      {/* Books Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">ISBN</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location (Rack/Shelf)</th>
                <th className="py-3 px-4 text-center">Copies</th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {books.length > 0 ? (
                books.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{b.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {b.publisher} {b.edition ? `&bull; ${b.edition}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{b.author}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{b.isbn || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-[10px]">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {b.rackNumber || 'N/A'} / {b.shelfLocation || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-200">{b.totalCopies}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          b.availableCopies > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {b.availableCopies} Left
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenCopies(b)}
                          title="Manage Physical Copies"
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center space-x-1"
                        >
                          <Layers className="w-3 h-3 text-blue-400" />
                          <span>Copies ({b.totalCopies})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBook({ ...b });
                            setModalError(null);
                          }}
                          title="Edit Book Details"
                          className="p-1 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(b.id)}
                          title="Delete Book"
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {loading ? 'Loading catalog records...' : 'No books found matching your criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD BOOK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-white">Add New Book to Library</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="p-6 overflow-y-auto space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Introduction to Algorithms"
                    value={newBook.title}
                    onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Author / Writers *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thomas H. Cormen"
                    value={newBook.author}
                    onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">ISBN / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 9780262033848"
                    value={newBook.isbn}
                    onChange={e => setNewBook({ ...newBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Publisher</label>
                  <input
                    type="text"
                    placeholder="e.g. MIT Press"
                    value={newBook.publisher}
                    onChange={e => setNewBook({ ...newBook, publisher: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Edition</label>
                  <input
                    type="text"
                    placeholder="e.g. 4th Edition"
                    value={newBook.edition}
                    onChange={e => setNewBook({ ...newBook, edition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newBook.category}
                    onChange={e => setNewBook({ ...newBook, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {categories.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={newBook.publicationYear}
                    onChange={e => setNewBook({ ...newBook, publicationYear: parseInt(e.target.value, 10) || 2026 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Rack Number</label>
                  <input
                    type="text"
                    placeholder="Rack-A"
                    value={newBook.rackNumber}
                    onChange={e => setNewBook({ ...newBook, rackNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    placeholder="Shelf-2"
                    value={newBook.shelfLocation}
                    onChange={e => setNewBook({ ...newBook, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Physical Copies & Smart Identification Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 mt-4">
                <div className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Physical Copies & Smart Identification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Number of Initial Physical Copies</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={initialCopiesCount}
                      onChange={e => setInitialCopiesCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Each copy automatically receives a unique Accession ID (ACC-XXXXXX).
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Identification Method</label>
                    <select
                      value={copyIdType}
                      onChange={e => setCopyIdType(e.target.value as IdType)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="auto_lib_id">Automatic Library ID (LIB-000001)</option>
                      <option value="barcode">Existing Scanned Barcode / ISBN</option>
                      <option value="manual_lib_id">Manual Library ID</option>
                    </select>
                  </div>

                  {copyIdType === 'manual_lib_id' && (
                    <div className="col-span-2">
                      <label className="block text-slate-400 mb-1">Custom Library ID</label>
                      <input
                        type="text"
                        placeholder="e.g. CS-DEPT-001"
                        value={customManualId}
                        onChange={e => setCustomManualId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                      />
                    </div>
                  )}
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
                  Save Book & Physical Copies
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOOK MODAL */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-bold text-white">Edit Book Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="p-6 overflow-y-auto space-y-4 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={editingBook.title}
                    onChange={e => setEditingBook({ ...editingBook, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Author / Writers *</label>
                  <input
                    type="text"
                    required
                    value={editingBook.author}
                    onChange={e => setEditingBook({ ...editingBook, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">ISBN / Barcode</label>
                  <input
                    type="text"
                    value={editingBook.isbn}
                    onChange={e => setEditingBook({ ...editingBook, isbn: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Publisher</label>
                  <input
                    type="text"
                    value={editingBook.publisher}
                    onChange={e => setEditingBook({ ...editingBook, publisher: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Edition</label>
                  <input
                    type="text"
                    value={editingBook.edition}
                    onChange={e => setEditingBook({ ...editingBook, edition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingBook.category}
                    onChange={e => setEditingBook({ ...editingBook, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {categories.filter(c => c !== 'all').map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Publication Year</label>
                  <input
                    type="number"
                    value={editingBook.publicationYear}
                    onChange={e => setEditingBook({ ...editingBook, publicationYear: parseInt(e.target.value, 10) || 2026 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Rack Number</label>
                  <input
                    type="text"
                    value={editingBook.rackNumber}
                    onChange={e => setEditingBook({ ...editingBook, rackNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Shelf Location</label>
                  <input
                    type="text"
                    value={editingBook.shelfLocation}
                    onChange={e => setEditingBook({ ...editingBook, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
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

      {/* COPIES MANAGEMENT MODAL */}
      {showCopiesModal && selectedBookForCopies && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  <span>Physical Copies of '{selectedBookForCopies.title}'</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Location: {selectedBookForCopies.rackNumber} &bull; {selectedBookForCopies.shelfLocation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCopiesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Total Registered Physical Copies: {copiesList.length}</span>
                <button
                  type="button"
                  onClick={handleAddExtraCopy}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Copy</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                {copiesList.map((c, i) => (
                  <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/60 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white">{c.accessionNumber}</span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="font-mono text-blue-400 font-semibold">{c.libraryId}</span>
                        {c.barcode && <span className="text-slate-500 text-[10px]">Barcode: {c.barcode}</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Added: {new Date(c.addedDate).toLocaleDateString()} &bull; Condition: {c.conditionNotes || 'Good'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'available'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : c.status === 'issued'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {c.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => printBookBarcodeLabel(c, college)}
                        title="Print Spine Label"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
