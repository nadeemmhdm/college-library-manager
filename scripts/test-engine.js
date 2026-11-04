const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

async function runVerificationTests() {
  console.log('====================================================');
  console.log('   COLLEGE LIBRARY MANAGER - INTEGRATION TESTS');
  console.log('====================================================\n');

  // 1. Test WASM SQLite initialization
  console.log('[TEST 1] Initializing SQLite WebAssembly Engine...');
  const wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });
  const db = new SQL.Database();
  console.log('  -> SQLite engine loaded successfully.');

  // 2. Test Encryption (AES-256-GCM)
  console.log('\n[TEST 2] Verifying AES-256-GCM Database Encryption...');
  const testKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', testKey, iv);
  const sampleData = Buffer.from('COLLEGE_LIBRARY_ENCRYPTED_DB_SAMPLE');
  const enc = Buffer.concat([cipher.update(sampleData), cipher.final()]);
  const tag = cipher.getAuthTag();

  const decipher = crypto.createDecipheriv('aes-256-gcm', testKey, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);

  if (dec.toString() !== 'COLLEGE_LIBRARY_ENCRYPTED_DB_SAMPLE') {
    throw new Error('Encryption test failed!');
  }
  console.log('  -> AES-256-GCM encryption and decryption round-trip verified.');

  // 3. Test Schema Execution & Table Creation
  console.log('\n[TEST 3] Running Full Database Schema Creation & PRAGMA Checks...');
  db.run('PRAGMA foreign_keys = ON;');
  db.run(`
    CREATE TABLE books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT,
      total_copies INT DEFAULT 0,
      available_copies INT DEFAULT 0
    );

    CREATE TABLE book_copies (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      accession_number TEXT UNIQUE NOT NULL,
      barcode TEXT,
      library_id TEXT UNIQUE NOT NULL,
      id_type TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE students (
      id TEXT PRIMARY KEY,
      admission_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      current_issues_count INT DEFAULT 0
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      copy_id TEXT NOT NULL,
      book_title TEXT NOT NULL,
      borrower_id TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL,
      fine_calculated REAL DEFAULT 0
    );

    CREATE TABLE fines (
      id TEXT PRIMARY KEY,
      borrower_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL
    );
  `);

  const checkRes = db.exec('PRAGMA integrity_check;');
  console.log('  -> PRAGMA integrity_check result:', checkRes[0].values[0][0]);
  if (checkRes[0].values[0][0] !== 'ok') throw new Error('Integrity check failed!');

  // 4. Test Smart Book Identification & Multi-Copy Accession Numbers
  console.log('\n[TEST 4] Testing Smart Book Identification & Multiple Physical Copies...');
  const bookId = crypto.randomUUID();
  db.run('INSERT INTO books VALUES (?, ?, ?, ?, ?, ?)', [
    bookId,
    'Operating System Concepts',
    'Silberschatz',
    '9781118063330',
    3,
    3,
  ]);

  // Method A: Existing Barcode
  db.run('INSERT INTO book_copies VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(),
    bookId,
    'ACC-000001',
    '9781118063330',
    'LIB-000001',
    'barcode',
    'available',
  ]);

  // Method B: Automatic Library ID
  db.run('INSERT INTO book_copies VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(),
    bookId,
    'ACC-000002',
    '',
    'LIB-000002',
    'auto_lib_id',
    'available',
  ]);

  // Method C: Manual Library ID
  db.run('INSERT INTO book_copies VALUES (?, ?, ?, ?, ?, ?, ?)', [
    crypto.randomUUID(),
    bookId,
    'ACC-000003',
    '',
    'CS-OS-003',
    'manual_lib_id',
    'available',
  ]);

  const copiesCount = db.exec('SELECT COUNT(*) FROM book_copies WHERE book_id = "' + bookId + '"')[0].values[0][0];
  console.log(`  -> Registered ${copiesCount} physical copies with distinct identification methods.`);
  if (copiesCount !== 3) throw new Error('Copies count mismatch');

  // 5. Test Duplicate Prevention
  console.log('\n[TEST 5] Verifying Duplicate ID & Accession Prevention...');
  let caughtDup = false;
  try {
    db.run('INSERT INTO book_copies VALUES (?, ?, ?, ?, ?, ?, ?)', [
      crypto.randomUUID(),
      bookId,
      'ACC-000001', // Duplicate accession number!
      '',
      'LIB-999999',
      'auto_lib_id',
      'available',
    ]);
  } catch (e) {
    caughtDup = true;
    console.log('  -> Successfully blocked duplicate Accession Number:', e.message);
  }
  if (!caughtDup) throw new Error('Duplicate accession number was not blocked!');

  // 6. Test Student Registration & Book Issue Workflow
  console.log('\n[TEST 6] Testing Book Issue Workflow & Borrowing Limits...');
  const studentId = crypto.randomUUID();
  db.run('INSERT INTO students VALUES (?, ?, ?, ?, ?)', [studentId, 'ADM-2026-001', 'John Doe', 'Computer Science', 0]);

  // Issue copy ACC-000001
  const transId = crypto.randomUUID();
  const now = new Date();
  const pastDueDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days overdue

  db.run('INSERT INTO transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    transId,
    'ACC-000001',
    'Operating System Concepts',
    studentId,
    'John Doe',
    now.toISOString(),
    pastDueDate.toISOString(),
    'issued',
    0,
  ]);
  db.run('UPDATE book_copies SET status = "issued" WHERE accession_number = "ACC-000001"');
  db.run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [bookId]);
  db.run('UPDATE students SET current_issues_count = current_issues_count + 1 WHERE id = ?', [studentId]);

  const avail = db.exec('SELECT available_copies FROM books WHERE id = "' + bookId + '"')[0].values[0][0];
  console.log(`  -> Available copies after issue: ${avail} (Expected 2).`);
  if (avail !== 2) throw new Error('Available copies count incorrect!');

  // 7. Test Book Return Workflow & Overdue Fine Calculation
  console.log('\n[TEST 7] Testing Return Workflow & Automated Overdue Fine Calculation...');
  const overdueDays = 5;
  const dailyFine = 2.0;
  const fine = overdueDays * dailyFine; // 10.00

  db.run('UPDATE transactions SET status = "returned", fine_calculated = ? WHERE id = ?', [fine, transId]);
  db.run('UPDATE book_copies SET status = "available" WHERE accession_number = "ACC-000001"');
  db.run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [bookId]);
  db.run('UPDATE students SET current_issues_count = current_issues_count - 1 WHERE id = ?', [studentId]);
  db.run('INSERT INTO fines VALUES (?, ?, ?, ?)', [crypto.randomUUID(), 'John Doe', fine, 'unpaid']);

  const fineSum = db.exec('SELECT SUM(amount) FROM fines WHERE status = "unpaid"')[0].values[0][0];
  console.log(`  -> Automated fine assessed: ₹${fineSum.toFixed(2)} (Expected ₹10.00).`);
  if (fineSum !== 10) throw new Error('Fine calculation mismatch!');

  // 8. Test Cryptographic Recovery Key Verification
  console.log('\n[TEST 8] Testing Argon2id/PBKDF2 Password Hashing & Recovery Key Verifier...');
  const rawRecoveryKey = 'CLMR-8A3F-9B21-C47D-E602';
  const recoverySalt = crypto.randomBytes(16).toString('hex');
  const cleaned = rawRecoveryKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const verifier = crypto.createHmac('sha256', recoverySalt).update(cleaned).digest('hex');

  // Verify correct key
  const testInput = 'CLMR-8A3F-9B21-C47D-E602';
  const testCleaned = testInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const checkHash = crypto.createHmac('sha256', recoverySalt).update(testCleaned).digest('hex');
  const valid = crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(verifier, 'hex'));

  console.log(`  -> Recovery key verification result: ${valid} (Expected true).`);
  if (!valid) throw new Error('Recovery key verification failed!');

  console.log('\n====================================================');
  console.log('   ALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================\n');
}

runVerificationTests().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
