import React, { useState, useEffect } from 'react';
import { Search, Book, User, GraduationCap, ArrowRight, X } from 'lucide-react';
import { Book as BookType, Student, Teacher } from '../../../shared/types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: BookType) => void;
  onSelectStudent: (student: Student) => void;
  onSelectTeacher: (teacher: Teacher) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectBook,
  onSelectStudent,
  onSelectTeacher,
}) => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<BookType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setBooks([]);
      setStudents([]);
      setTeachers([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const [bRes, sRes, tRes] = await Promise.all([
            window.electronAPI.getBooks({ search: query.trim() }),
            window.electronAPI.getStudents({ search: query.trim() }),
            window.electronAPI.getTeachers({ search: query.trim() }),
          ]);
          setBooks(bRes.slice(0, 5));
          setStudents(sRes.slice(0, 5));
          setTeachers(tRes.slice(0, 5));
        } catch (e) {
        } finally {
          setLoading(false);
        }
      } else {
        setBooks([]);
        setStudents([]);
        setTeachers([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search books, authors, students, teachers, accession numbers, or barcodes..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500"
          />
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {loading && (
            <div className="text-center py-6 text-xs text-slate-400">Searching records...</div>
          )}

          {!loading && query.length >= 2 && books.length === 0 && students.length === 0 && teachers.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              No matching books, students, or faculty found.
            </div>
          )}

          {/* Books Section */}
          {books.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                <Book className="w-3.5 h-3.5 text-blue-400" />
                <span>Books ({books.length})</span>
              </div>
              <div className="space-y-1">
                {books.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBook(b);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between text-left text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-white">{b.title}</div>
                      <div className="text-slate-400 text-[11px]">by {b.author} &bull; {b.category} &bull; {b.availableCopies}/{b.totalCopies} Available</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Students Section */}
          {students.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Students ({students.length})</span>
              </div>
              <div className="space-y-1">
                {students.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectStudent(s);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between text-left text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-white">{s.fullName} ({s.admissionNumber})</div>
                      <div className="text-slate-400 text-[11px]">{s.department} &bull; {s.academicYear} &bull; {s.currentIssuesCount} Active Issues</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teachers Section */}
          {teachers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span>Teachers & Faculty ({teachers.length})</span>
              </div>
              <div className="space-y-1">
                {teachers.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTeacher(t);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-between text-left text-xs transition"
                  >
                    <div>
                      <div className="font-semibold text-white">{t.fullName} ({t.employeeId})</div>
                      <div className="text-slate-400 text-[11px]">{t.designation} &bull; {t.department} &bull; {t.currentIssuesCount} Active Issues</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500 px-4">
          <span>Navigate with arrows or click to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
