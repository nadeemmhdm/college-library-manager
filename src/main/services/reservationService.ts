import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { Reservation, BorrowerType } from '../../shared/types';
import { PatronService } from './patronService';

export class ReservationService {
  private db: DatabaseService;
  private patronService: PatronService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.patronService = new PatronService();
  }

  public getAllReservations(status?: string, search?: string): Reservation[] {
    let sql = 'SELECT * FROM reservations WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (book_title LIKE ? OR borrower_name LIKE ? OR borrower_identifier LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY reservation_date ASC';
    const rows = this.db.query<any>(sql, params);

    return rows.map(r => ({
      id: r.id,
      bookId: r.book_id,
      bookTitle: r.book_title,
      borrowerType: r.borrower_type as BorrowerType,
      borrowerId: r.borrower_id,
      borrowerIdentifier: r.borrower_identifier,
      borrowerName: r.borrower_name,
      reservationDate: r.reservation_date,
      expiryDate: r.expiry_date,
      status: r.status,
      queuePosition: Number(r.queue_position),
      allocatedCopyId: r.allocated_copy_id,
    }));
  }

  public createReservation(params: {
    bookId: string;
    borrowerType: BorrowerType;
    borrowerIdentifier: string;
  }): { success: boolean; reservation?: Reservation; error?: string } {
    try {
      // 1. Get Book
      const books = this.db.query<any>('SELECT * FROM books WHERE id = ?', [params.bookId]);
      if (!books || books.length === 0) return { success: false, error: 'Book not found.' };
      const book = books[0];

      // 2. Identify Borrower
      let borrowerName = '';
      let borrowerId = '';
      if (params.borrowerType === 'student') {
        const student = this.patronService.findStudentByIdentifier(params.borrowerIdentifier);
        if (!student) return { success: false, error: `Student '${params.borrowerIdentifier}' not found.` };
        borrowerName = student.fullName;
        borrowerId = student.id;
      } else {
        const teacher = this.patronService.findTeacherByIdentifier(params.borrowerIdentifier);
        if (!teacher) return { success: false, error: `Teacher '${params.borrowerIdentifier}' not found.` };
        borrowerName = teacher.fullName;
        borrowerId = teacher.id;
      }

      // Check if already reserved by this borrower
      const existing = this.db.query(
        "SELECT id FROM reservations WHERE book_id = ? AND borrower_id = ? AND status IN ('waiting', 'ready_for_pickup')",
        [params.bookId, borrowerId]
      );
      if (existing.length > 0) {
        return { success: false, error: 'You already have an active reservation for this book.' };
      }

      // 3. Queue position
      const queueRes = this.db.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = 'waiting'",
        [params.bookId]
      );
      const queuePosition = (queueRes[0]?.count || 0) + 1;

      const id = crypto.randomUUID();
      const now = new Date();
      const reservationDate = now.toISOString();
      const expiryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      this.db.run(
        `INSERT INTO reservations (
          id, book_id, book_title, borrower_type, borrower_id,
          borrower_identifier, borrower_name, reservation_date,
          expiry_date, status, queue_position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?)`,
        [
          id,
          book.id,
          book.title,
          params.borrowerType,
          borrowerId,
          params.borrowerIdentifier.trim(),
          borrowerName,
          reservationDate,
          expiryDate,
          queuePosition,
        ]
      );

      this.logReservationActivity('CREATE_RESERVATION', `Reserved '${book.title}' for ${borrowerName} (Queue: ${queuePosition})`, 'success');
      return {
        success: true,
        reservation: {
          id,
          bookId: book.id,
          bookTitle: book.title,
          borrowerType: params.borrowerType,
          borrowerId,
          borrowerIdentifier: params.borrowerIdentifier,
          borrowerName,
          reservationDate,
          expiryDate,
          status: 'waiting',
          queuePosition,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public cancelReservation(id: string): { success: boolean; error?: string } {
    try {
      const rows = this.db.query<any>('SELECT * FROM reservations WHERE id = ?', [id]);
      if (!rows || rows.length === 0) return { success: false, error: 'Reservation not found.' };

      const res = rows[0];
      if (res.allocated_copy_id) {
        // Free the reserved copy
        this.db.run("UPDATE book_copies SET status = 'available' WHERE id = ?", [res.allocated_copy_id]);
      }

      this.db.run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id]);
      this.logReservationActivity('CANCEL_RESERVATION', `Cancelled reservation ID ${id} for '${res.book_title}'`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private logReservationActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
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
