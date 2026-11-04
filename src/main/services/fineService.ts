import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { FineRecord, BorrowerType } from '../../shared/types';

export class FineService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public getAllFines(status?: 'all' | 'unpaid' | 'paid' | 'waived', search?: string): FineRecord[] {
    let sql = 'SELECT * FROM fines WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (borrower_name LIKE ? OR borrower_identifier LIKE ? OR receipt_number LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY date_assessed DESC';
    const rows = this.db.query<any>(sql, params);

    return rows.map(r => ({
      id: r.id,
      transactionId: r.transaction_id,
      borrowerType: r.borrower_type as BorrowerType,
      borrowerId: r.borrower_id,
      borrowerIdentifier: r.borrower_identifier,
      borrowerName: r.borrower_name,
      reason: r.reason,
      amount: Number(r.amount),
      paidAmount: Number(r.paid_amount || 0),
      waivedAmount: Number(r.waived_amount || 0),
      status: r.status,
      dateAssessed: r.date_assessed,
      dateSettled: r.date_settled,
      receiptNumber: r.receipt_number,
      notes: r.notes,
    }));
  }

  // Pay fine (Full or Partial)
  public payFine(fineId: string, amountToPay: number, notes?: string): { success: boolean; receiptNumber?: string; error?: string } {
    try {
      const rows = this.db.query<any>('SELECT * FROM fines WHERE id = ?', [fineId]);
      if (!rows || rows.length === 0) return { success: false, error: 'Fine record not found.' };

      const fine = rows[0];
      const totalAmount = Number(fine.amount);
      const currentPaid = Number(fine.paid_amount || 0);
      const currentWaived = Number(fine.waived_amount || 0);
      const remaining = totalAmount - (currentPaid + currentWaived);

      if (amountToPay <= 0) {
        return { success: false, error: 'Payment amount must be greater than zero.' };
      }

      if (amountToPay > remaining) {
        return { success: false, error: `Payment amount exceeds remaining balance of ${remaining}.` };
      }

      const newPaid = currentPaid + amountToPay;
      const isSettled = newPaid + currentWaived >= totalAmount;
      const newStatus = isSettled ? 'paid' : 'partially_paid';
      const now = new Date().toISOString();
      const receiptNumber = fine.receipt_number || `REC-${Date.now().toString().slice(-8)}`;

      this.db.run(
        `UPDATE fines SET
          paid_amount = ?,
          status = ?,
          date_settled = ?,
          receipt_number = ?,
          notes = COALESCE(?, notes)
         WHERE id = ?`,
        [newPaid, newStatus, isSettled ? now : null, receiptNumber, notes, fineId]
      );

      this.logFineActivity(
        'FINE_PAYMENT',
        `Collected payment of ${amountToPay} for fine ID ${fineId} (${fine.borrower_name}). Receipt: ${receiptNumber}`,
        'success'
      );

      return { success: true, receiptNumber };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Waive fine
  public waiveFine(fineId: string, reason: string): { success: boolean; error?: string } {
    try {
      const rows = this.db.query<any>('SELECT * FROM fines WHERE id = ?', [fineId]);
      if (!rows || rows.length === 0) return { success: false, error: 'Fine record not found.' };

      const fine = rows[0];
      const totalAmount = Number(fine.amount);
      const currentPaid = Number(fine.paid_amount || 0);
      const remaining = totalAmount - currentPaid;
      const now = new Date().toISOString();

      this.db.run(
        `UPDATE fines SET
          waived_amount = ?,
          status = 'waived',
          date_settled = ?,
          notes = ?
         WHERE id = ?`,
        [remaining, now, `Waived by Librarian: ${reason}`, fineId]
      );

      this.logFineActivity('FINE_WAIVED', `Waived fine of ${remaining} for ${fine.borrower_name}. Reason: ${reason}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private logFineActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.db.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'fine', details, status]
      );
    } catch {}
  }
}
