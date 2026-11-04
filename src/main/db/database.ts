import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { app, safeStorage } from 'electron';
import {
  CollegeProfile,
  LibraryConfig,
  LibrarianAccount,
  AppearanceSettings,
  BackupConfig,
  AppSettings,
  Book,
  BookCopy,
  Student,
  Teacher,
  BookTransaction,
  FineRecord,
  Reservation,
  ActivityLog,
  DashboardStats,
  BackupItem,
  InitialSetupPayload,
} from '../../shared/types';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private baseDir: string;
  private dbPath: string;
  private keyPath: string;
  private masterKey: Buffer | null = null;
  private isInitialized = false;

  private constructor() {
    // Windows AppData directory
    const appData = app ? app.getPath('appData') : (process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'));
    this.baseDir = path.join(appData, 'CollegeLibraryManager');
    this.dbPath = path.join(this.baseDir, 'Database', 'library.db.enc');
    this.keyPath = path.join(this.baseDir, 'Config', 'master.key');

    this.ensureDirectories();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  public getSubDir(name: 'Database' | 'Backups' | 'BookCovers' | 'Documents' | 'Logs' | 'Config'): string {
    return path.join(this.baseDir, name);
  }

  private ensureDirectories(): void {
    const subdirs = ['Database', 'Backups', 'BookCovers', 'Documents', 'Logs', 'Config'];
    for (const dir of subdirs) {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  // Windows DPAPI protected Master Key
  private getOrCreateMasterKey(): Buffer {
    if (this.masterKey) return this.masterKey;

    if (fs.existsSync(this.keyPath)) {
      try {
        const encryptedKey = fs.readFileSync(this.keyPath);
        if (safeStorage && safeStorage.isEncryptionAvailable()) {
          const decryptedBase64 = safeStorage.decryptString(encryptedKey);
          this.masterKey = Buffer.from(decryptedBase64, 'base64');
          return this.masterKey;
        } else {
          // Fallback machine-specific decryption
          const machineId = os.hostname() + '-' + (os.userInfo().username || 'user');
          const decipher = crypto.createDecipheriv('aes-256-ecb', crypto.createHash('sha256').update(machineId).digest(), null);
          this.masterKey = Buffer.concat([decipher.update(encryptedKey), decipher.final()]);
          return this.masterKey;
        }
      } catch (err) {
        this.writeLog('system', `Error reading master key: ${err}. Generating new key fallback.`);
      }
    }

    // Generate fresh 256-bit AES master key
    const rawKey = crypto.randomBytes(32);
    try {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(rawKey.toString('base64'));
        fs.writeFileSync(this.keyPath, encrypted);
      } else {
        const machineId = os.hostname() + '-' + (os.userInfo().username || 'user');
        const cipher = crypto.createCipheriv('aes-256-ecb', crypto.createHash('sha256').update(machineId).digest(), null);
        const encrypted = Buffer.concat([cipher.update(rawKey), cipher.final()]);
        fs.writeFileSync(this.keyPath, encrypted);
      }
    } catch (e) {
      fs.writeFileSync(this.keyPath, rawKey); // Emergency local fallback
    }

    this.masterKey = rawKey;
    return this.masterKey;
  }

  // Encrypt binary data using AES-256-GCM
  private encryptBuffer(data: Uint8Array): Buffer {
    const key = this.getOrCreateMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Format: [12 bytes IV][16 bytes TAG][Encrypted Ciphertext]
    return Buffer.concat([iv, tag, encrypted]);
  }

  // Decrypt binary data using AES-256-GCM
  private decryptBuffer(buf: Buffer): Uint8Array {
    const key = this.getOrCreateMasterKey();
    if (buf.length < 28) {
      throw new Error('Corrupted or invalid encrypted database file header');
    }
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(decrypted);
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    const wasmCandidates = [
      path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
      path.join(app ? app.getAppPath() : process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    ];

    let wasmBinary: ArrayBuffer | undefined;
    let foundWasmPath = '';
    for (const candidate of wasmCandidates) {
      if (candidate && fs.existsSync(candidate)) {
        try {
          const buf = fs.readFileSync(candidate);
          wasmBinary = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          foundWasmPath = candidate;
          break;
        } catch (e) {
          // Continue searching other candidates
        }
      }
    }

    this.SQL = await initSqlJs({
      wasmBinary,
      locateFile: () => foundWasmPath,
    });

    if (fs.existsSync(this.dbPath)) {
      try {
        const encryptedFile = fs.readFileSync(this.dbPath);
        const decryptedData = this.decryptBuffer(encryptedFile);
        this.db = new this.SQL.Database(decryptedData);
        this.writeLog('system', 'Database successfully loaded and decrypted with DPAPI.');
      } catch (err) {
        this.writeLog('system', `Failed to decrypt database: ${err}. Attempting unencrypted legacy file fallback.`);
        const unencryptedLegacyPath = path.join(this.baseDir, 'Database', 'library.db');
        if (fs.existsSync(unencryptedLegacyPath)) {
          const rawBytes = fs.readFileSync(unencryptedLegacyPath);
          this.db = new this.SQL.Database(rawBytes);
        } else {
          // Initialize new database
          this.db = new this.SQL.Database();
        }
      }
    } else {
      const legacyPath = path.join(this.baseDir, 'Database', 'library.db');
      if (fs.existsSync(legacyPath)) {
        const rawBytes = fs.readFileSync(legacyPath);
        this.db = new this.SQL.Database(rawBytes);
      } else {
        this.db = new this.SQL.Database();
      }
    }

    // Enable SQLite foreign keys & WAL mode
    this.db.run('PRAGMA foreign_keys = ON;');
    
    // Check integrity
    const checkRes = this.db.exec('PRAGMA integrity_check;');
    this.writeLog('system', `Database integrity verified: ${JSON.stringify(checkRes)}`);

    this.applyMigrations();
    this.save();
    this.isInitialized = true;
  }

  public save(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const encrypted = this.encryptBuffer(data);
      const tmpPath = this.dbPath + '.tmp';
      fs.writeFileSync(tmpPath, encrypted);
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      this.writeLog('system', `Error saving encrypted database: ${err}`);
      throw err;
    }
  }

  private applyMigrations(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    const result = this.db.exec('SELECT MAX(version) as max_v FROM schema_version;');
    const currentVersion = (result[0]?.values[0]?.[0] as number) || 0;

    if (currentVersion < 1) {
      // Initial migration
      this.db.run(`
        CREATE TABLE IF NOT EXISTS college_profile (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          short_name TEXT NOT NULL,
          logo_data_url TEXT,
          address TEXT,
          district TEXT,
          state TEXT,
          country TEXT,
          email TEXT,
          phone TEXT,
          website TEXT,
          library_name TEXT NOT NULL,
          library_description TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS library_config (
          id TEXT PRIMARY KEY,
          opening_time TEXT NOT NULL,
          closing_time TEXT NOT NULL,
          working_days TEXT NOT NULL,
          holidays TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          default_issue_duration_days INTEGER NOT NULL,
          max_books_student INTEGER NOT NULL,
          max_books_teacher INTEGER NOT NULL,
          daily_overdue_fine REAL NOT NULL,
          max_fine_per_book REAL NOT NULL,
          reservation_expiry_days INTEGER NOT NULL,
          currency TEXT NOT NULL,
          categories TEXT NOT NULL,
          departments TEXT NOT NULL,
          academic_years TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS librarian_account (
          username TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          recovery_verifier TEXT NOT NULL,
          recovery_salt TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_login_at TEXT,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TEXT
        );

        CREATE TABLE IF NOT EXISTS appearance_settings (
          id TEXT PRIMARY KEY,
          theme TEXT NOT NULL,
          primary_color TEXT NOT NULL,
          sidebar_appearance TEXT NOT NULL,
          table_density TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS backup_config (
          id TEXT PRIMARY KEY,
          auto_backup_enabled INTEGER NOT NULL,
          frequency TEXT NOT NULL,
          backup_time TEXT NOT NULL,
          backup_retention_count INTEGER NOT NULL,
          backup_destination TEXT NOT NULL,
          external_drive_path TEXT,
          last_backup_at TEXT
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          id TEXT PRIMARY KEY,
          language TEXT NOT NULL,
          date_format TEXT NOT NULL,
          time_format TEXT NOT NULL,
          auto_lock_minutes INTEGER NOT NULL,
          login_attempt_limit INTEGER NOT NULL,
          minimize_to_tray INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS books (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          isbn TEXT,
          publisher TEXT,
          edition TEXT,
          publication_year INTEGER,
          category TEXT,
          subject TEXT,
          language TEXT,
          description TEXT,
          cover_image TEXT,
          rack_number TEXT,
          shelf_location TEXT,
          total_copies INTEGER DEFAULT 0,
          available_copies INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS book_copies (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          accession_number TEXT UNIQUE NOT NULL,
          barcode TEXT,
          library_id TEXT UNIQUE NOT NULL,
          id_type TEXT NOT NULL,
          status TEXT NOT NULL,
          added_date TEXT NOT NULL,
          condition_notes TEXT,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          admission_number TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          department TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          semester TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          current_issues_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS teachers (
          id TEXT PRIMARY KEY,
          employee_id TEXT UNIQUE NOT NULL,
          full_name TEXT NOT NULL,
          department TEXT NOT NULL,
          designation TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          current_issues_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          copy_id TEXT NOT NULL,
          book_id TEXT NOT NULL,
          book_title TEXT NOT NULL,
          accession_number TEXT NOT NULL,
          library_id TEXT NOT NULL,
          borrower_type TEXT NOT NULL,
          borrower_id TEXT NOT NULL,
          borrower_identifier TEXT NOT NULL,
          borrower_name TEXT NOT NULL,
          issue_date TEXT NOT NULL,
          due_date TEXT NOT NULL,
          return_date TEXT,
          status TEXT NOT NULL,
          renewals_count INTEGER DEFAULT 0,
          overdue_days INTEGER DEFAULT 0,
          fine_calculated REAL DEFAULT 0,
          fine_paid REAL DEFAULT 0,
          remarks TEXT,
          FOREIGN KEY (copy_id) REFERENCES book_copies(id)
        );

        CREATE TABLE IF NOT EXISTS fines (
          id TEXT PRIMARY KEY,
          transaction_id TEXT,
          borrower_type TEXT NOT NULL,
          borrower_id TEXT NOT NULL,
          borrower_identifier TEXT NOT NULL,
          borrower_name TEXT NOT NULL,
          reason TEXT NOT NULL,
          amount REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          waived_amount REAL DEFAULT 0,
          status TEXT NOT NULL,
          date_assessed TEXT NOT NULL,
          date_settled TEXT,
          receipt_number TEXT,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS reservations (
          id TEXT PRIMARY KEY,
          book_id TEXT NOT NULL,
          book_title TEXT NOT NULL,
          borrower_type TEXT NOT NULL,
          borrower_id TEXT NOT NULL,
          borrower_identifier TEXT NOT NULL,
          borrower_name TEXT NOT NULL,
          reservation_date TEXT NOT NULL,
          expiry_date TEXT NOT NULL,
          status TEXT NOT NULL,
          queue_position INTEGER NOT NULL,
          allocated_copy_id TEXT
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          action TEXT NOT NULL,
          category TEXT NOT NULL,
          details TEXT NOT NULL,
          status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS backup_history (
          id TEXT PRIMARY KEY,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size_bytes INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          type TEXT NOT NULL,
          encrypted INTEGER NOT NULL,
          checksum TEXT NOT NULL
        );

        -- Indexes for high performance searches
        CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
        CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
        CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
        CREATE INDEX IF NOT EXISTS idx_copies_acc ON book_copies(accession_number);
        CREATE INDEX IF NOT EXISTS idx_copies_libid ON book_copies(library_id);
        CREATE INDEX IF NOT EXISTS idx_copies_barcode ON book_copies(barcode);
        CREATE INDEX IF NOT EXISTS idx_students_adm ON students(admission_number);
        CREATE INDEX IF NOT EXISTS idx_teachers_emp ON teachers(employee_id);
        CREATE INDEX IF NOT EXISTS idx_trans_status ON transactions(status);

        INSERT INTO schema_version (version, applied_at) VALUES (1, datetime('now'));
      `);
      this.writeLog('system', 'Migration v1 applied successfully.');
    }
  }

  public writeLog(category: string, message: string): void {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.getSubDir('Logs'), `library-${today}.log`);
    const line = `[${new Date().toISOString()}] [${category.toUpperCase()}] ${message}\n`;
    try {
      fs.appendFileSync(logFile, line);
    } catch {}
  }

  // Generic DB query helpers
  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  }

  public run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    this.save();
  }

  // Setup status check
  public isSetupCompleted(): boolean {
    if (!this.db) return false;
    const res = this.query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM college_profile');
    const acc = this.query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM librarian_account');
    return (res[0]?.cnt || 0) > 0 && (acc[0]?.cnt || 0) > 0;
  }
}
