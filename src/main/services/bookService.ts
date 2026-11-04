import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { Book, BookCopy, IdType, CopyStatus } from '../../shared/types';

export class BookService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Generate unique sequential Accession Number (e.g. ACC-000001)
  public generateNextAccessionNumber(): string {
    const res = this.db.query<{ max_acc: string }>(
      "SELECT accession_number as max_acc FROM book_copies ORDER BY id DESC LIMIT 1"
    );
    if (!res || res.length === 0 || !res[0].max_acc) {
      return 'ACC-000001';
    }
    const match = res[0].max_acc.match(/ACC-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `ACC-${nextNum.toString().padStart(6, '0')}`;
    }
    return `ACC-${Date.now().toString().slice(-6)}`;
  }

  // Generate Automatic Library ID (e.g. LIB-000001)
  public generateNextLibraryId(): string {
    const res = this.db.query<{ max_lib: string }>(
      "SELECT library_id as max_lib FROM book_copies WHERE library_id LIKE 'LIB-%' ORDER BY library_id DESC LIMIT 1"
    );
    if (!res || res.length === 0 || !res[0].max_lib) {
      return 'LIB-000001';
    }
    const match = res[0].max_lib.match(/LIB-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `LIB-${nextNum.toString().padStart(6, '0')}`;
    }
    return `LIB-${Date.now().toString().slice(-6)}`;
  }

  // Check if a library ID or Barcode already exists
  public isLibraryIdTaken(libraryId: string, excludeCopyId?: string): boolean {
    const query = excludeCopyId
      ? 'SELECT id FROM book_copies WHERE library_id = ? AND id != ?'
      : 'SELECT id FROM book_copies WHERE library_id = ?';
    const params = excludeCopyId ? [libraryId.trim(), excludeCopyId] : [libraryId.trim()];
    const res = this.db.query(query, params);
    return res.length > 0;
  }

  public isBarcodeTaken(barcode: string, excludeCopyId?: string): boolean {
    if (!barcode || !barcode.trim()) return false;
    const query = excludeCopyId
      ? 'SELECT id FROM book_copies WHERE barcode = ? AND id != ?'
      : 'SELECT id FROM book_copies WHERE barcode = ?';
    const params = excludeCopyId ? [barcode.trim(), excludeCopyId] : [barcode.trim()];
    const res = this.db.query(query, params);
    return res.length > 0;
  }

  public getAllBooks(search?: string, category?: string): Book[] {
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR publisher LIKE ?)';
      params.push(term, term, term, term);
    }

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY title ASC';
    const books = this.db.query<any>(sql, params);

    return books.map(b => ({
      ...b,
      totalCopies: Number(b.total_copies),
      availableCopies: Number(b.available_copies),
      publicationYear: Number(b.publication_year),
      rackNumber: b.rack_number,
      shelfLocation: b.shelf_location,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
  }

  public getBookById(id: string): { book: Book; copies: BookCopy[] } | null {
    const books = this.db.query<any>('SELECT * FROM books WHERE id = ?', [id]);
    if (!books || books.length === 0) return null;

    const b = books[0];
    const copiesRaw = this.db.query<any>(
      'SELECT * FROM book_copies WHERE book_id = ? ORDER BY accession_number ASC',
      [id]
    );

    const copies: BookCopy[] = copiesRaw.map(c => ({
      id: c.id,
      bookId: c.book_id,
      accessionNumber: c.accession_number,
      barcode: c.barcode || '',
      libraryId: c.library_id,
      idType: c.id_type as IdType,
      status: c.status as CopyStatus,
      addedDate: c.added_date,
      conditionNotes: c.condition_notes,
      bookTitle: b.title,
      author: b.author,
      rackNumber: b.rack_number,
      shelfLocation: b.shelf_location,
    }));

    const book: Book = {
      ...b,
      totalCopies: Number(b.total_copies),
      availableCopies: Number(b.available_copies),
      publicationYear: Number(b.publication_year),
      rackNumber: b.rack_number,
      shelfLocation: b.shelf_location,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    };

    return { book, copies };
  }

  // Create Book with multiple physical copies
  public createBook(
    bookData: Omit<Book, 'id' | 'totalCopies' | 'availableCopies' | 'createdAt' | 'updatedAt'>,
    copiesData: Array<{
      idType: IdType;
      barcode?: string;
      libraryId?: string;
      conditionNotes?: string;
    }>
  ): { success: boolean; bookId?: string; error?: string } {
    try {
      const bookId = crypto.randomUUID();
      const now = new Date().toISOString();
      const totalCopies = copiesData.length;
      const availableCopies = totalCopies;

      // Validate uniqueness for all copies
      for (const copy of copiesData) {
        if (copy.idType === 'manual_lib_id' && copy.libraryId) {
          if (this.isLibraryIdTaken(copy.libraryId)) {
            return { success: false, error: `Library ID '${copy.libraryId}' is already in use.` };
          }
        }
        if (copy.barcode && copy.barcode.trim()) {
          if (this.isBarcodeTaken(copy.barcode)) {
            return { success: false, error: `Barcode '${copy.barcode}' is already in use by another book copy.` };
          }
        }
      }

      // Insert Book
      this.db.run(
        `INSERT INTO books (
          id, title, author, isbn, publisher, edition, publication_year, 
          category, subject, language, description, cover_image, 
          rack_number, shelf_location, total_copies, available_copies, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookId,
          bookData.title.trim(),
          bookData.author.trim(),
          bookData.isbn?.trim() || '',
          bookData.publisher?.trim() || '',
          bookData.edition?.trim() || '',
          bookData.publicationYear || new Date().getFullYear(),
          bookData.category?.trim() || 'General',
          bookData.subject?.trim() || '',
          bookData.language?.trim() || 'English',
          bookData.description?.trim() || '',
          bookData.coverImage || '',
          bookData.rackNumber?.trim() || '',
          bookData.shelfLocation?.trim() || '',
          totalCopies,
          availableCopies,
          now,
          now,
        ]
      );

      // Insert Copies
      for (let i = 0; i < copiesData.length; i++) {
        const c = copiesData[i];
        const copyId = crypto.randomUUID();
        const accNum = this.generateNextAccessionNumber();

        let libId = c.libraryId?.trim();
        if (c.idType === 'auto_lib_id' || !libId) {
          libId = this.generateNextLibraryId();
        }

        const barcode = c.barcode?.trim() || (c.idType === 'barcode' ? bookData.isbn?.trim() || libId : '');

        this.db.run(
          `INSERT INTO book_copies (
            id, book_id, accession_number, barcode, library_id, 
            id_type, status, added_date, condition_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            copyId,
            bookId,
            accNum,
            barcode,
            libId,
            c.idType,
            'available',
            now,
            c.conditionNotes?.trim() || 'Good',
          ]
        );
      }

      this.logBookActivity('CREATE_BOOK', `Added new book '${bookData.title}' with ${totalCopies} copies.`, 'success');
      return { success: true, bookId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create book record.' };
    }
  }

  // Update book metadata
  public updateBook(id: string, updates: Partial<Book>): { success: boolean; error?: string } {
    try {
      const now = new Date().toISOString();
      this.db.run(
        `UPDATE books SET
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          isbn = COALESCE(?, isbn),
          publisher = COALESCE(?, publisher),
          edition = COALESCE(?, edition),
          publication_year = COALESCE(?, publication_year),
          category = COALESCE(?, category),
          subject = COALESCE(?, subject),
          language = COALESCE(?, language),
          description = COALESCE(?, description),
          cover_image = COALESCE(?, cover_image),
          rack_number = COALESCE(?, rack_number),
          shelf_location = COALESCE(?, shelf_location),
          updated_at = ?
         WHERE id = ?`,
        [
          updates.title,
          updates.author,
          updates.isbn,
          updates.publisher,
          updates.edition,
          updates.publicationYear,
          updates.category,
          updates.subject,
          updates.language,
          updates.description,
          updates.coverImage,
          updates.rackNumber,
          updates.shelfLocation,
          now,
          id,
        ]
      );
      this.logBookActivity('UPDATE_BOOK', `Updated book id: ${id}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update book.' };
    }
  }

  // Add individual copy to existing book
  public addCopy(bookId: string, copyData: {
    idType: IdType;
    barcode?: string;
    libraryId?: string;
    conditionNotes?: string;
  }): { success: boolean; copy?: BookCopy; error?: string } {
    try {
      if (copyData.idType === 'manual_lib_id' && copyData.libraryId) {
        if (this.isLibraryIdTaken(copyData.libraryId)) {
          return { success: false, error: `Library ID '${copyData.libraryId}' is already in use.` };
        }
      }

      if (copyData.barcode && copyData.barcode.trim()) {
        if (this.isBarcodeTaken(copyData.barcode)) {
          return { success: false, error: `Barcode '${copyData.barcode}' is already registered.` };
        }
      }

      const copyId = crypto.randomUUID();
      const accNum = this.generateNextAccessionNumber();
      let libId = copyData.libraryId?.trim();
      if (copyData.idType === 'auto_lib_id' || !libId) {
        libId = this.generateNextLibraryId();
      }
      const barcode = copyData.barcode?.trim() || '';
      const now = new Date().toISOString();

      this.db.run(
        `INSERT INTO book_copies (
          id, book_id, accession_number, barcode, library_id, 
          id_type, status, added_date, condition_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [copyId, bookId, accNum, barcode, libId, copyData.idType, 'available', now, copyData.conditionNotes || 'Good']
      );

      // Increment total and available copies count
      this.db.run(
        'UPDATE books SET total_copies = total_copies + 1, available_copies = available_copies + 1, updated_at = ? WHERE id = ?',
        [now, bookId]
      );

      this.logBookActivity('ADD_COPY', `Added copy ${accNum} (${libId}) to book ${bookId}`, 'success');
      return {
        success: true,
        copy: {
          id: copyId,
          bookId,
          accessionNumber: accNum,
          barcode,
          libraryId: libId,
          idType: copyData.idType,
          status: 'available',
          addedDate: now,
          conditionNotes: copyData.conditionNotes || 'Good',
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Delete book and its physical copies
  public deleteBook(id: string): { success: boolean; error?: string } {
    try {
      // Check if any copy is currently issued
      const activeCopies = this.db.query(
        "SELECT id FROM book_copies WHERE book_id = ? AND status = 'issued'",
        [id]
      );
      if (activeCopies.length > 0) {
        return { success: false, error: 'Cannot delete book because one or more copies are currently issued.' };
      }

      this.db.run('DELETE FROM book_copies WHERE book_id = ?', [id]);
      this.db.run('DELETE FROM books WHERE id = ?', [id]);
      this.logBookActivity('DELETE_BOOK', `Deleted book id: ${id}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Find copy by Barcode, Accession Number, or Library ID (Smart Search)
  public findCopyByIdentifier(identifier: string): BookCopy | null {
    const cleaned = identifier.trim();
    if (!cleaned) return null;

    const sql = `
      SELECT c.*, b.title as bookTitle, b.author, b.rack_number as rackNumber, b.shelf_location as shelfLocation
      FROM book_copies c
      JOIN books b ON c.book_id = b.id
      WHERE c.accession_number = ? OR c.library_id = ? OR c.barcode = ?
      LIMIT 1
    `;
    const res = this.db.query<any>(sql, [cleaned, cleaned, cleaned]);
    if (!res || res.length === 0) return null;

    const c = res[0];
    return {
      id: c.id,
      bookId: c.book_id,
      accessionNumber: c.accession_number,
      barcode: c.barcode || '',
      libraryId: c.library_id,
      idType: c.id_type as IdType,
      status: c.status as CopyStatus,
      addedDate: c.added_date,
      conditionNotes: c.condition_notes,
      bookTitle: c.bookTitle,
      author: c.author,
      rackNumber: c.rackNumber,
      shelfLocation: c.shelfLocation,
    };
  }

  // Bulk import books from CSV parsed records
  public bulkImportBooks(rows: Array<{
    title: string;
    author: string;
    isbn?: string;
    publisher?: string;
    edition?: string;
    publicationYear?: number | string;
    category?: string;
    rackNumber?: string;
    shelfLocation?: string;
    copiesCount?: number | string;
  }>): { imported: number; errors: string[] } {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.title || !row.title.trim()) {
        errors.push(`Row ${i + 1}: Missing book title.`);
        continue;
      }
      if (!row.author || !row.author.trim()) {
        errors.push(`Row ${i + 1}: Missing book author.`);
        continue;
      }

      const numCopies = Math.max(1, parseInt(String(row.copiesCount || 1), 10) || 1);
      const copiesData = Array.from({ length: numCopies }).map(() => ({
        idType: 'auto_lib_id' as IdType,
        barcode: row.isbn ? String(row.isbn).trim() : '',
      }));

      const res = this.createBook(
        {
          title: row.title,
          author: row.author,
          isbn: row.isbn ? String(row.isbn) : '',
          publisher: row.publisher ? String(row.publisher) : '',
          edition: row.edition ? String(row.edition) : '',
          publicationYear: parseInt(String(row.publicationYear || new Date().getFullYear()), 10) || new Date().getFullYear(),
          category: row.category ? String(row.category) : 'General',
          subject: '',
          language: 'English',
          description: '',
          rackNumber: row.rackNumber ? String(row.rackNumber) : '',
          shelfLocation: row.shelfLocation ? String(row.shelfLocation) : '',
        },
        copiesData
      );

      if (res.success) {
        imported++;
      } else {
        errors.push(`Row ${i + 1} (${row.title}): ${res.error}`);
      }
    }

    this.logBookActivity('BULK_IMPORT', `Bulk imported ${imported} books with ${errors.length} errors.`, 'success');
    return { imported, errors };
  }

  private logBookActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.db.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'book', details, status]
      );
    } catch {}
  }
}
