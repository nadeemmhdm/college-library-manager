import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Filter, Calendar, BookOpen, AlertTriangle, Coins } from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BookTransaction, FineRecord, CollegeProfile } from '../../../shared/types';

interface ReportsViewProps {
  college: CollegeProfile | null;
  currency?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ college, currency = '₹' }) => {
  const [reportType, setReportType] = useState<'overdue' | 'circulation' | 'fines'>('overdue');
  const [transactions, setTransactions] = useState<BookTransaction[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trans, f] = await Promise.all([
        window.electronAPI.getTransactionHistory(200),
        window.electronAPI.getFines({ status: 'all' }),
      ]);
      setTransactions(trans);
      setFines(f);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const overdueList = transactions.filter(t => t.status === 'overdue' || (t.status === 'issued' && new Date(t.dueDate) < new Date()));

  // Export CSV
  const handleExportCSV = () => {
    let dataToExport: any[] = [];
    let filename = '';

    if (reportType === 'overdue') {
      filename = `Overdue_Books_${new Date().toISOString().split('T')[0]}.csv`;
      dataToExport = overdueList.map(o => ({
        BookTitle: o.bookTitle,
        AccessionNo: o.accessionNumber,
        LibraryID: o.libraryId,
        Borrower: o.borrowerName,
        BorrowerID: o.borrowerIdentifier,
        Type: o.borrowerType,
        IssueDate: o.issueDate.split('T')[0],
        DueDate: o.dueDate.split('T')[0],
        OverdueDays: o.overdueDays,
        FineCalculated: o.fineCalculated,
      }));
    } else if (reportType === 'circulation') {
      filename = `Circulation_History_${new Date().toISOString().split('T')[0]}.csv`;
      dataToExport = transactions.map(t => ({
        BookTitle: t.bookTitle,
        AccessionNo: t.accessionNumber,
        Borrower: t.borrowerName,
        BorrowerID: t.borrowerIdentifier,
        Type: t.borrowerType,
        IssueDate: t.issueDate.split('T')[0],
        DueDate: t.dueDate.split('T')[0],
        ReturnDate: t.returnDate ? t.returnDate.split('T')[0] : 'Not Returned',
        Status: t.status,
      }));
    } else {
      filename = `Fines_Collection_${new Date().toISOString().split('T')[0]}.csv`;
      dataToExport = fines.map(f => ({
        Borrower: f.borrowerName,
        BorrowerID: f.borrowerIdentifier,
        Reason: f.reason,
        Amount: f.amount,
        Paid: f.paidAmount,
        Waived: f.waivedAmount,
        Status: f.status,
        ReceiptNo: f.receiptNumber || 'N/A',
        DateAssessed: f.dateAssessed.split('T')[0],
      }));
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Export PDF with branding
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const collegeName = college?.name || 'College Library';
    const libName = college?.libraryName || 'Central Library';

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(collegeName, 14, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${libName} - Institutional Report`, 14, 21);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);

    let tableData: any[][] = [];
    let headers: string[] = [];

    if (reportType === 'overdue') {
      doc.text('OVERDUE BOOKS REPORT', 14, 34);
      headers = ['Title', 'Acc No', 'Borrower', 'Due Date', 'Overdue Days', 'Fine'];
      tableData = overdueList.map(o => [
        o.bookTitle.slice(0, 25),
        o.accessionNumber,
        `${o.borrowerName} (${o.borrowerIdentifier})`,
        new Date(o.dueDate).toLocaleDateString(),
        o.overdueDays.toString(),
        `${currency}${o.fineCalculated.toFixed(2)}`,
      ]);
    } else if (reportType === 'circulation') {
      doc.text('CIRCULATION TRANSACTION LOG', 14, 34);
      headers = ['Title', 'Borrower', 'Issue Date', 'Due Date', 'Status'];
      tableData = transactions.slice(0, 50).map(t => [
        t.bookTitle.slice(0, 25),
        `${t.borrowerName} (${t.borrowerIdentifier})`,
        new Date(t.issueDate).toLocaleDateString(),
        new Date(t.dueDate).toLocaleDateString(),
        t.status.toUpperCase(),
      ]);
    } else {
      doc.text('FINES & PENALTIES AUDIT REPORT', 14, 34);
      headers = ['Borrower', 'Reason', 'Assessed', 'Paid', 'Status', 'Receipt'];
      tableData = fines.slice(0, 50).map(f => [
        f.borrowerName,
        f.reason.toUpperCase(),
        `${currency}${f.amount.toFixed(2)}`,
        `${currency}${f.paidAmount.toFixed(2)}`,
        f.status.toUpperCase(),
        f.receiptNumber || '—',
      ]);
    }

    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 38,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span>Library Reports & Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate and export printable institutional records, audit logs, and circulation summaries.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF Document</span>
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setReportType('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            reportType === 'overdue'
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue Books ({overdueList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('circulation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            reportType === 'circulation'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Circulation History ({transactions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setReportType('fines')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            reportType === 'fines'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Fines Collection ({fines.length})</span>
        </button>
      </div>

      {/* Report Data Display */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {reportType === 'overdue' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Acc No & Lib ID</th>
                  <th className="py-3 px-4">Borrower Details</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Days Overdue</th>
                  <th className="py-3 px-4 text-right">Calculated Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overdueList.length > 0 ? (
                  overdueList.map(o => (
                    <tr key={o.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white text-sm">{o.bookTitle}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {o.accessionNumber} &bull; <span className="text-blue-400">{o.libraryId}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {o.borrowerName} ({o.borrowerIdentifier})
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(o.dueDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-center font-bold text-red-400">{o.overdueDays} Days</td>
                      <td className="py-3 px-4 text-right font-black text-rose-400">
                        {currency}
                        {o.fineCalculated.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      No overdue book loans on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {reportType === 'circulation' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.slice(0, 100).map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white text-sm">{t.bookTitle}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.borrowerName} ({t.borrowerIdentifier})
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(t.issueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-slate-800 text-slate-300">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'fines' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Borrower</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Waived</th>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {fines.slice(0, 100).map(f => (
                  <tr key={f.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white text-sm">{f.borrowerName}</td>
                    <td className="py-3 px-4 uppercase text-slate-400 text-[11px]">{f.reason}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {currency}
                      {f.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      {currency}
                      {f.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-purple-400">
                      {currency}
                      {f.waivedAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{f.receiptNumber || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-slate-800 text-slate-300">
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
