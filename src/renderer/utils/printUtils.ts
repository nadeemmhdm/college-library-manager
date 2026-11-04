import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { BookTransaction, FineRecord, Student, BookCopy, CollegeProfile } from '../../shared/types';

export function printIssueReceipt(transaction: BookTransaction, college: CollegeProfile | null, currency = '₹') {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 140], // Thermal receipt slip size 80mm
  });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(college?.name || 'COLLEGE LIBRARY', 40, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(college?.libraryName || 'Central Library', 40, 15, { align: 'center' });
  if (college?.phone) {
    doc.text(`Phone: ${college.phone}`, 40, 19, { align: 'center' });
  }

  doc.line(5, 22, 75, 22);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOK ISSUE SLIP', 40, 27, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Transaction ID: ${transaction.id.slice(0, 8)}`, 5, 33);
  doc.text(`Date & Time: ${new Date(transaction.issueDate).toLocaleString()}`, 5, 37);

  doc.line(5, 40, 75, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('BORROWER DETAILS:', 5, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${transaction.borrowerName}`, 5, 50);
  doc.text(`ID: ${transaction.borrowerIdentifier} (${transaction.borrowerType.toUpperCase()})`, 5, 54);

  doc.line(5, 57, 75, 57);

  doc.setFont('helvetica', 'bold');
  doc.text('BOOK DETAILS:', 5, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(`Title: ${transaction.bookTitle.slice(0, 30)}`, 5, 67);
  doc.text(`Accession No: ${transaction.accessionNumber}`, 5, 71);
  doc.text(`Library ID: ${transaction.libraryId}`, 5, 75);

  doc.line(5, 78, 75, 78);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`DUE DATE: ${new Date(transaction.dueDate).toLocaleDateString()}`, 5, 84);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Please return or renew before due date to avoid fines.', 40, 92, { align: 'center' });
  doc.text('Lost or damaged books will be charged as per rules.', 40, 96, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature', 60, 115, { align: 'center' });
  doc.line(45, 111, 75, 111);

  doc.autoPrint();
  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
}

export function printReturnReceipt(
  transaction: BookTransaction,
  college: CollegeProfile | null,
  fineRecord?: FineRecord | null,
  currency = '₹'
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 140],
  });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(college?.name || 'COLLEGE LIBRARY', 40, 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(college?.libraryName || 'Central Library', 40, 15, { align: 'center' });

  doc.line(5, 18, 75, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOK RETURN RECEIPT', 40, 24, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Return Date: ${new Date().toLocaleString()}`, 5, 30);
  doc.text(`Borrower: ${transaction.borrowerName} (${transaction.borrowerIdentifier})`, 5, 35);
  doc.text(`Book: ${transaction.bookTitle.slice(0, 28)}`, 5, 40);
  doc.text(`Acc No: ${transaction.accessionNumber} | Lib ID: ${transaction.libraryId}`, 5, 44);

  doc.line(5, 48, 75, 48);

  if (transaction.overdueDays > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Overdue Days: ${transaction.overdueDays}`, 5, 54);
    doc.text(`Overdue Fine: ${currency}${transaction.fineCalculated}`, 5, 59);
    if (fineRecord) {
      doc.text(`Status: ${fineRecord.status.toUpperCase()}`, 5, 64);
      doc.text(`Receipt No: ${fineRecord.receiptNumber || 'N/A'}`, 5, 69);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.text('Status: Returned on time (No Fine)', 5, 55);
  }

  doc.line(5, 75, 75, 75);
  doc.setFontSize(7);
  doc.text('Thank you for returning library property.', 40, 82, { align: 'center' });

  doc.autoPrint();
  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
}

export function printStudentLibraryCard(student: Student, college: CollegeProfile | null) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98], // Standard CR80 ID Card dimensions (85.6mm x 54mm)
  });

  // Border & Header
  doc.setFillColor(30, 58, 138); // Dark Navy Blue
  doc.rect(0, 0, 85.6, 12, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text((college?.shortName || college?.name || 'COLLEGE').toUpperCase(), 42.8, 5, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('STUDENT LIBRARY BORROWER CARD', 42.8, 9, { align: 'center' });

  // Student Photo Placeholder Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(5, 16, 20, 25);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(6);
  doc.text('PHOTO', 15, 29, { align: 'center' });

  // Student Details
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(student.fullName.toUpperCase(), 28, 19);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Adm No: ${student.admissionNumber}`, 28, 24);
  doc.text(`Department: ${student.department}`, 28, 28);
  doc.text(`Academic Year: ${student.academicYear}`, 28, 32);
  doc.text(`Semester: ${student.semester}`, 28, 36);
  doc.text(`Phone: ${student.phone || 'N/A'}`, 28, 40);

  // Barcode representation
  doc.setFillColor(0, 0, 0);
  doc.rect(5, 44, 45, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5);
  doc.text(`*${student.admissionNumber}*`, 27.5, 48, { align: 'center' });

  // Signature
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(5);
  doc.text('Librarian Signature', 68, 49, { align: 'center' });
  doc.line(55, 47, 80, 47);

  doc.autoPrint();
  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
}

export function printBookBarcodeLabel(copy: BookCopy, college: CollegeProfile | null) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 30], // Standard book spine label size 50mm x 30mm
  });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(college?.shortName || 'LIBRARY', 25, 5, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(copy.bookTitle?.slice(0, 28) || 'Book', 25, 9, { align: 'center' });

  // Barcode / Library ID visual box
  doc.setFillColor(240, 240, 240);
  doc.rect(3, 11, 44, 10, 'F');
  doc.setFillColor(0, 0, 0);
  doc.rect(6, 13, 38, 4, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(copy.libraryId, 25, 20, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Acc: ${copy.accessionNumber} | Loc: ${copy.rackNumber || ''}-${copy.shelfLocation || ''}`, 25, 26, {
    align: 'center',
  });

  doc.autoPrint();
  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
}
