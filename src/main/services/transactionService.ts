import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { BookTransaction, BorrowerType, TransactionStatus, LibraryConfig } from '../../shared/types';
import { BookService } from './bookService';
import { PatronService } from './patronService';

export class TransactionService {
  private db: DatabaseService;
  private bookService: BookService;
  private patronService: PatronService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.bookService = new BookService();
    this.patronService = new PatronService();
  }

  private getLibraryConfig(): LibraryConfig {
    const res = this.db.query<any>('SELECT * FROM library_config LIMIT 1');
    if (!res || res.length === 0) {
      return {
        openingTime: '08:30',
        closingTime: '17:30',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        holidays: ['Sunday'],
        academicYear: '2026-2027',
        defaultIssueDurationDays: 14,
        maxBooksStudent: 3,
        maxBooksTeacher: 10,
        dailyOverdueFine: 2.0,
        maxFinePerBook: 200.0,
        reservationExpiryDays: 3,
        currency: '₹',
        categories: ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Mathematics', 'Physics', 'Literature'],
        departments: ['Computer Science', 'Information Technology', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
        academicYears: ['2025-2026', '2026-2027'],
      };
    }

    const r = res[0];
    return {
      openingTime: r.opening_time,
      closingTime: r.closing_time,
      workingDays: JSON.parse(r.working_days || '[]'),
      holidays: JSON.parse(r.holidays || '[]'),
      academicYear: r.academic_year,
      defaultIssueDurationDays: Number(r.default_issue_duration_days),
      maxBooksStudent: Number(r.max_books_student),
      maxBooksTeacher: Number(r.max_books_teacher),
      dailyOverdueFine: Number(r.daily_overdue_fine),
      maxFinePerBook: Number(r.max_fine_per_book),
      reservationExpiryDays: Number(r.reservation_expiry_days),
      currency: r.currency || '₹',
      categories: JSON.parse(r.categories || '[]'),
      departments: JSON.parse(r.departments || '[]'),
      academicYears: JSON.parse(r.academic_years || '[]'),
    };
  }

  // Issue Book Workflow
  public issueBook(params: {
    copyIdentifier: string; // Barcode, Accession Number, or Library ID
    borrowerType: BorrowerType;
    borrowerIdentifier: string; // Admission Number or Employee ID
    customDurationDays?: number;
    remarks?: string;
  }): { success: boolean; transaction?: BookTransaction; error?: string } {
    try {
      const config = this.getLibraryConfig();

      // 1. Identify copy
      const copy = this.bookService.findCopyByIdentifier(params.copyIdentifier);
      if (!copy) {
        return { success: false, error: `Book copy '${params.copyIdentifier}' not found.` };
      }

      if (copy.status !== 'available') {
        return { success: false, error: `Book copy '${copy.accessionNumber}' is not available (Current status: ${copy.status}).` };
      }

      // 2. Identify borrower
      let borrowerName = '';
      let borrowerId = '';
      let currentIssues = 0;
      let limit = params.borrowerType === 'student' ? config.maxBooksStudent : config.maxBooksTeacher;

      if (params.borrowerType === 'student') {
        const student = this.patronService.findStudentByIdentifier(params.borrowerIdentifier);
        if (!student) {
          return { success: false, error: `Student '${params.borrowerIdentifier}' not found.` };
        }
        if (student.status !== 'active') {
          return { success: false, error: 'Student record is archived or inactive.' };
        }
        borrowerName = student.fullName;
        borrowerId = student.id;
        currentIssues = student.currentIssuesCount;
      } else {
        const teacher = this.patronService.findTeacherByIdentifier(params.borrowerIdentifier);
        if (!teacher) {
          return { success: false, error: `Teacher '${params.borrowerIdentifier}' not found.` };
        }
        if (teacher.status !== 'active') {
          return { success: false, error: 'Teacher record is archived or inactive.' };
        }
        borrowerName = teacher.fullName;
        borrowerId = teacher.id;
        currentIssues = teacher.currentIssuesCount;
      }

      // 3. Check limit
      if (currentIssues >= limit) {
        return {
          success: false,
          error: `Borrowing limit reached for ${params.borrowerType}. Max allowed: ${limit}. Currently issued: ${currentIssues}.`,
        };
      }

      // 4. Calculate Due Date
      const durationDays = params.customDurationDays || config.defaultIssueDurationDays;
      const now = new Date();
      const issueDate = now.toISOString();
      const dueDateObj = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const dueDate = dueDateObj.toISOString();

      const transactionId = crypto.randomUUID();

      // 5. Atomic database updates
      this.db.run(
        `INSERT INTO transactions (
          id, copy_id, book_id, book_title, accession_number, library_id,
          borrower_type, borrower_id, borrower_identifier, borrower_name,
          issue_date, due_date, status, renewals_count, overdue_days,
          fine_calculated, fine_paid, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          copy.id,
          copy.bookId,
          copy.bookTitle || 'Unknown Book',
          copy.accessionNumber,
          copy.libraryId,
          params.borrowerType,
          borrowerId,
          params.borrowerIdentifier.trim(),
          borrowerName,
          issueDate,
          dueDate,
          'issued',
          0,
          0,
          0,
          0,
          params.remarks || '',
        ]
      );

      // Update copy status
      this.db.run("UPDATE book_copies SET status = 'issued' WHERE id = ?", [copy.id]);

      // Decrement available copies
      this.db.run(
        'UPDATE books SET available_copies = MAX(0, available_copies - 1), updated_at = ? WHERE id = ?',
        [issueDate, copy.bookId]
      );

      // Increment borrower issue count
      if (params.borrowerType === 'student') {
        this.db.run('UPDATE students SET current_issues_count = current_issues_count + 1 WHERE id = ?', [borrowerId]);
      } else {
        this.db.run('UPDATE teachers SET current_issues_count = current_issues_count + 1 WHERE id = ?', [borrowerId]);
      }

      this.logTransactionActivity(
        'ISSUE_BOOK',
        `Issued '${copy.bookTitle}' (${copy.accessionNumber}) to ${borrowerName} (${params.borrowerIdentifier}) until ${dueDate.split('T')[0]}`,
        'success'
      );

      return {
        success: true,
        transaction: {
          id: transactionId,
          copyId: copy.id,
          bookId: copy.bookId,
          bookTitle: copy.bookTitle || '',
          accessionNumber: copy.accessionNumber,
          libraryId: copy.libraryId,
          borrowerType: params.borrowerType,
          borrowerId,
          borrowerIdentifier: params.borrowerIdentifier,
          borrowerName,
          issueDate,
          dueDate,
          status: 'issued',
          renewalsCount: 0,
          overdueDays: 0,
          fineCalculated: 0,
          finePaid: 0,
          remarks: params.remarks,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Return Book Workflow
  public returnBook(params: {
    copyIdentifier: string; // Barcode, Accession Number, or Library ID
    conditionNotes?: string;
    waiveFine?: boolean;
    finePaid?: number;
  }): {
    success: boolean;
    overdueDays?: number;
    fineCalculated?: number;
    receiptNumber?: string;
    error?: string;
  } {
    try {
      const config = this.getLibraryConfig();

      // 1. Find copy
      const copy = this.bookService.findCopyByIdentifier(params.copyIdentifier);
      if (!copy) {
        return { success: false, error: `Book copy '${params.copyIdentifier}' not found.` };
      }

      // 2. Find active transaction
      const transRows = this.db.query<any>(
        "SELECT * FROM transactions WHERE copy_id = ? AND status IN ('issued', 'overdue') ORDER BY issue_date DESC LIMIT 1",
        [copy.id]
      );

      if (!transRows || transRows.length === 0) {
        return { success: false, error: `No active issue record found for copy '${copy.accessionNumber}' (${copy.libraryId}).` };
      }

      const trans = transRows[0];
      const now = new Date();
      const returnDate = now.toISOString();

      // 3. Calculate overdue
      const dueDate = new Date(trans.due_date);
      const diffMs = now.getTime() - dueDate.getTime();
      const overdueDays = diffMs > 0 ? Math.ceil(diffMs / (24 * 60 * 60 * 1000)) : 0;

      let fineCalculated = 0;
      if (overdueDays > 0) {
        fineCalculated = Math.min(overdueDays * config.dailyOverdueFine, config.maxFinePerBook);
      }

      let receiptNumber = '';

      // 4. Create fine record if fine applies and not completely waived
      if (fineCalculated > 0) {
        const fineId = crypto.randomUUID();
        receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
        const paidAmount = params.finePaid || 0;
        const waivedAmount = params.waiveFine ? fineCalculated : 0;
        const status = waivedAmount >= fineCalculated ? 'waived' : paidAmount >= fineCalculated ? 'paid' : 'unpaid';

        this.db.run(
          `INSERT INTO fines (
            id, transaction_id, borrower_type, borrower_id, borrower_identifier,
            borrower_name, reason, amount, paid_amount, waived_amount,
            status, date_assessed, date_settled, receipt_number, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fineId,
            trans.id,
            trans.borrower_type,
            trans.borrower_id,
            trans.borrower_identifier,
            trans.borrower_name,
            'overdue',
            fineCalculated,
            paidAmount,
            waivedAmount,
            status,
            returnDate,
            status !== 'unpaid' ? returnDate : null,
            receiptNumber,
            params.conditionNotes || '',
          ]
        );
      }

      // 5. Update transaction
      this.db.run(
        `UPDATE transactions SET
          return_date = ?,
          status = 'returned',
          overdue_days = ?,
          fine_calculated = ?,
          fine_paid = ?
         WHERE id = ?`,
        [returnDate, overdueDays, fineCalculated, params.finePaid || 0, trans.id]
      );

      // 6. Update copy status & notes
      this.db.run(
        "UPDATE book_copies SET status = 'available', condition_notes = COALESCE(?, condition_notes) WHERE id = ?",
        [params.conditionNotes, copy.id]
      );

      // 7. Increment available copies
      this.db.run(
        'UPDATE books SET available_copies = available_copies + 1, updated_at = ? WHERE id = ?',
        [returnDate, copy.bookId]
      );

      // 8. Decrement borrower issue count
      if (trans.borrower_type === 'student') {
        this.db.run(
          'UPDATE students SET current_issues_count = MAX(0, current_issues_count - 1) WHERE id = ?',
          [trans.borrower_id]
        );
      } else {
        this.db.run(
          'UPDATE teachers SET current_issues_count = MAX(0, current_issues_count - 1) WHERE id = ?',
          [trans.borrower_id]
        );
      }

      // 9. Check reservations queue
      this.checkAndAllocateReservation(copy.bookId, copy.id);

      this.logTransactionActivity(
        'RETURN_BOOK',
        `Returned '${trans.book_title}' (${copy.accessionNumber}) from ${trans.borrower_name}. Overdue: ${overdueDays} days, Fine: ${config.currency}${fineCalculated}`,
        'success'
      );

      return {
        success: true,
        overdueDays,
        fineCalculated,
        receiptNumber: fineCalculated > 0 ? receiptNumber : undefined,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Renew Book
  public renewBook(transactionId: string): { success: boolean; newDueDate?: string; error?: string } {
    try {
      const config = this.getLibraryConfig();
      const rows = this.db.query<any>('SELECT * FROM transactions WHERE id = ?', [transactionId]);
      if (!rows || rows.length === 0) return { success: false, error: 'Transaction not found.' };

      const trans = rows[0];
      if (trans.status !== 'issued') {
        return { success: false, error: `Cannot renew book in status '${trans.status}'.` };
      }

      if (Number(trans.renewals_count) >= 2) {
        return { success: false, error: 'Maximum renewal limit (2 times) reached for this transaction.' };
      }

      const currentDue = new Date(trans.due_date);
      const newDue = new Date(currentDue.getTime() + config.defaultIssueDurationDays * 24 * 60 * 60 * 1000);
      const newDueDate = newDue.toISOString();

      this.db.run(
        'UPDATE transactions SET due_date = ?, renewals_count = renewals_count + 1 WHERE id = ?',
        [newDueDate, transactionId]
      );

      this.logTransactionActivity('RENEW_BOOK', `Renewed '${trans.book_title}' to new due date ${newDueDate.split('T')[0]}`, 'success');
      return { success: true, newDueDate };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Mark Book as Lost or Damaged
  public markLostOrDamaged(copyId: string, status: 'lost' | 'damaged', fineAmount: number, notes?: string): { success: boolean; error?: string } {
    try {
      const copies = this.db.query<any>('SELECT * FROM book_copies WHERE id = ?', [copyId]);
      if (!copies || copies.length === 0) return { success: false, error: 'Copy not found.' };
      const copy = copies[0];

      const activeTrans = this.db.query<any>(
        "SELECT * FROM transactions WHERE copy_id = ? AND status IN ('issued', 'overdue') LIMIT 1",
        [copyId]
      );

      const now = new Date().toISOString();

      // Update copy
      this.db.run('UPDATE book_copies SET status = ? WHERE id = ?', [status, copyId]);

      if (activeTrans.length > 0) {
        const trans = activeTrans[0];
        // Close transaction with status
        this.db.run('UPDATE transactions SET status = ?, return_date = ? WHERE id = ?', [status, now, trans.id]);

        // Assess fine
        if (fineAmount > 0) {
          const fineId = crypto.randomUUID();
          this.db.run(
            `INSERT INTO fines (
              id, transaction_id, borrower_type, borrower_id, borrower_identifier,
              borrower_name, reason, amount, status, date_assessed, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)`,
            [fineId, trans.id, trans.borrower_type, trans.borrower_id, trans.borrower_identifier, trans.borrower_name, status, fineAmount, now, notes || '']
          );
        }

        // Decrement patron active issues
        if (trans.borrower_type === 'student') {
          this.db.run('UPDATE students SET current_issues_count = MAX(0, current_issues_count - 1) WHERE id = ?', [trans.borrower_id]);
        } else {
          this.db.run('UPDATE teachers SET current_issues_count = MAX(0, current_issues_count - 1) WHERE id = ?', [trans.borrower_id]);
        }
      }

      this.logTransactionActivity('COPY_STATUS_CHANGE', `Marked copy ${copy.accession_number} as ${status}. Fine assessed: ${fineAmount}`, 'warning');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Active issues list with live overdue calculation
  public getActiveTransactions(search?: string): BookTransaction[] {
    let sql = "SELECT * FROM transactions WHERE status IN ('issued', 'overdue')";
    const params: any[] = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (book_title LIKE ? OR accession_number LIKE ? OR library_id LIKE ? OR borrower_name LIKE ? OR borrower_identifier LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY due_date ASC';
    const rows = this.db.query<any>(sql, params);
    const config = this.getLibraryConfig();
    const now = Date.now();

    return rows.map(r => {
      const dueTime = new Date(r.due_date).getTime();
      const isOverdue = now > dueTime;
      const overdueDays = isOverdue ? Math.ceil((now - dueTime) / (24 * 60 * 60 * 1000)) : 0;
      const fineCalculated = overdueDays > 0 ? Math.min(overdueDays * config.dailyOverdueFine, config.maxFinePerBook) : 0;

      return {
        id: r.id,
        copyId: r.copy_id,
        bookId: r.book_id,
        bookTitle: r.book_title,
        accessionNumber: r.accession_number,
        libraryId: r.library_id,
        borrowerType: r.borrower_type as BorrowerType,
        borrowerId: r.borrower_id,
        borrowerIdentifier: r.borrower_identifier,
        borrowerName: r.borrower_name,
        issueDate: r.issue_date,
        dueDate: r.due_date,
        returnDate: r.return_date,
        status: isOverdue ? 'overdue' : (r.status as TransactionStatus),
        renewalsCount: Number(r.renewals_count || 0),
        overdueDays,
        fineCalculated,
        finePaid: Number(r.fine_paid || 0),
        remarks: r.remarks,
      };
    });
  }

  // Complete transactions history
  public getTransactionHistory(limit = 100): BookTransaction[] {
    const rows = this.db.query<any>(
      'SELECT * FROM transactions ORDER BY issue_date DESC LIMIT ?',
      [limit]
    );

    return rows.map(r => ({
      id: r.id,
      copyId: r.copy_id,
      bookId: r.book_id,
      bookTitle: r.book_title,
      accessionNumber: r.accession_number,
      libraryId: r.library_id,
      borrowerType: r.borrower_type as BorrowerType,
      borrowerId: r.borrower_id,
      borrowerIdentifier: r.borrower_identifier,
      borrowerName: r.borrower_name,
      issueDate: r.issue_date,
      dueDate: r.due_date,
      returnDate: r.return_date,
      status: r.status as TransactionStatus,
      renewalsCount: Number(r.renewals_count || 0),
      overdueDays: Number(r.overdue_days || 0),
      fineCalculated: Number(r.fine_calculated || 0),
      finePaid: Number(r.fine_paid || 0),
      remarks: r.remarks,
    }));
  }

  // If a reservation is waiting for this book, assign it
  private checkAndAllocateReservation(bookId: string, copyId: string): void {
    const waiting = this.db.query<any>(
      "SELECT * FROM reservations WHERE book_id = ? AND status = 'waiting' ORDER BY queue_position ASC LIMIT 1",
      [bookId]
    );
    if (waiting.length > 0) {
      const res = waiting[0];
      const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      this.db.run(
        "UPDATE reservations SET status = 'ready_for_pickup', allocated_copy_id = ?, expiry_date = ? WHERE id = ?",
        [copyId, expiry, res.id]
      );
      this.db.run("UPDATE book_copies SET status = 'reserved' WHERE id = ?", [copyId]);
      this.logTransactionActivity('RESERVATION_ALLOCATED', `Reserved book copy allocated to ${res.borrower_name}`, 'success');
    }
  }

  private logTransactionActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.db.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'issue', details, status]
      );
    } catch {}
  }
}
