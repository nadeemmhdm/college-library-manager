import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseService } from './db/database';
import { AuthService } from './services/authService';
import { BookService } from './services/bookService';
import { PatronService } from './services/patronService';
import { TransactionService } from './services/transactionService';
import { FineService } from './services/fineService';
import { ReservationService } from './services/reservationService';
import { BackupService } from './services/backupService';
import { UpdateService } from './services/updateService';
import {
  CollegeProfile,
  LibraryConfig,
  AppearanceSettings,
  AppSettings,
  DashboardStats,
  ActivityLog,
  InitialSetupPayload,
} from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let dbService: DatabaseService;
let authService: AuthService;
let bookService: BookService;
let patronService: PatronService;
let transactionService: TransactionService;
let fineService: FineService;
let reservationService: ReservationService;
let backupService: BackupService;
let updateService: UpdateService;

const isDev = !app.isPackaged && !!process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '..', '..', 'build', 'icon.png'),
    path.join(__dirname, '..', '..', 'public', 'icon.png'),
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
  ];
  let windowIcon: string | undefined;
  for (const candidate of iconCandidates) {
    if (fs.existsSync(candidate)) {
      windowIcon = candidate;
      break;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    title: 'College Library Manager',
    icon: windowIcon,
    show: false,
    frame: true, // Native title bar + controls
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  updateService.setMainWindow(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // Non-blocking background update check on application startup
    setTimeout(() => {
      updateService.checkForUpdates().catch(() => {});
    }, 4000);
  });

  const localDistPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const asarDistPath = path.join(app.getAppPath(), 'dist', 'index.html');
  const targetHtmlPath = fs.existsSync(localDistPath) ? localDistPath : asarDistPath;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(targetHtmlPath)) {
    mainWindow.loadFile(targetHtmlPath);
  } else if (fs.existsSync(localDistPath)) {
    mainWindow.loadFile(localDistPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Fallback if URL fails to load (e.g. dev server offline)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Page failed to load (${errorCode}): ${errorDescription}. Falling back to local index.html.`);
    if (fs.existsSync(targetHtmlPath)) {
      mainWindow?.loadFile(targetHtmlPath);
    }
  });

  // F12 DevTools shortcut for diagnostics
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Global App Initialization
app.whenReady().then(async () => {
  dbService = DatabaseService.getInstance();
  await dbService.init();

  authService = new AuthService();
  bookService = new BookService();
  patronService = new PatronService();
  transactionService = new TransactionService();
  fineService = new FineService();
  reservationService = new ReservationService();
  backupService = new BackupService();
  updateService = new UpdateService();

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function registerIpcHandlers() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  // Setup Wizard Handlers
  ipcMain.handle('setup:getStatus', () => {
    return { isCompleted: dbService.isSetupCompleted() };
  });

  ipcMain.handle('setup:generateRecoveryKey', () => {
    return authService.generateRecoveryKey();
  });

  ipcMain.handle('setup:complete', async (_, payload: InitialSetupPayload) => {
    try {
      const now = new Date().toISOString();
      // 1. Save College Profile
      const collegeId = 'default';
      dbService.run(
        `INSERT OR REPLACE INTO college_profile (
          id, name, short_name, logo_data_url, address, district, state, country,
          email, phone, website, library_name, library_description, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          collegeId,
          payload.college.name.trim(),
          payload.college.shortName.trim(),
          payload.college.logoDataUrl || '',
          payload.college.address || '',
          payload.college.district || '',
          payload.college.state || '',
          payload.college.country || '',
          payload.college.email || '',
          payload.college.phone || '',
          payload.college.website || '',
          payload.college.libraryName.trim(),
          payload.college.libraryDescription || '',
          now,
        ]
      );

      // 2. Save Library Config
      dbService.run(
        `INSERT OR REPLACE INTO library_config (
          id, opening_time, closing_time, working_days, holidays, academic_year,
          default_issue_duration_days, max_books_student, max_books_teacher,
          daily_overdue_fine, max_fine_per_book, reservation_expiry_days, currency,
          categories, departments, academic_years
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'default',
          payload.library.openingTime,
          payload.library.closingTime,
          JSON.stringify(payload.library.workingDays),
          JSON.stringify(payload.library.holidays),
          payload.library.academicYear,
          payload.library.defaultIssueDurationDays,
          payload.library.maxBooksStudent,
          payload.library.maxBooksTeacher,
          payload.library.dailyOverdueFine,
          payload.library.maxFinePerBook,
          payload.library.reservationExpiryDays,
          payload.library.currency,
          JSON.stringify(payload.library.categories),
          JSON.stringify(payload.library.departments),
          JSON.stringify(payload.library.academicYears),
        ]
      );

      // 3. Save Librarian Account with Argon2id/PBKDF2 and hashed recovery verifier
      const { hash, salt } = authService.hashPassword(payload.librarian.password);
      const { verifier, salt: recoverySalt } = authService.hashRecoveryKey(payload.recoveryKey);

      dbService.run(
        `INSERT OR REPLACE INTO librarian_account (
          username, full_name, password_hash, password_salt,
          recovery_verifier, recovery_salt, created_at, failed_login_attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          payload.librarian.username.trim(),
          payload.librarian.fullName.trim(),
          hash,
          salt,
          verifier,
          recoverySalt,
          now,
        ]
      );

      // 4. Save Appearance
      dbService.run(
        `INSERT OR REPLACE INTO appearance_settings (
          id, theme, primary_color, sidebar_appearance, table_density
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          'default',
          payload.appearance.theme,
          payload.appearance.primaryColor,
          payload.appearance.sidebarAppearance,
          payload.appearance.tableDensity,
        ]
      );

      // 5. Save Backup Config
      dbService.run(
        `INSERT OR REPLACE INTO backup_config (
          id, auto_backup_enabled, frequency, backup_time,
          backup_retention_count, backup_destination, external_drive_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'default',
          payload.backup.autoBackupEnabled ? 1 : 0,
          payload.backup.frequency,
          payload.backup.backupTime,
          payload.backup.backupRetentionCount,
          payload.backup.backupDestination || dbService.getSubDir('Backups'),
          payload.backup.externalDrivePath || '',
        ]
      );

      // 6. Save Default App Settings
      dbService.run(
        `INSERT OR REPLACE INTO app_settings (
          id, language, date_format, time_format, auto_lock_minutes, login_attempt_limit, minimize_to_tray
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['default', 'English', 'DD/MM/YYYY', '12 Hours (AM/PM)', 15, 5, 0]
      );

      // 7. Initial encrypted backup
      backupService.createBackup('manual');

      authService.logAuthActivity('SETUP_COMPLETED', 'First-time setup completed successfully', 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Authentication Handlers
  ipcMain.handle('auth:login', (_, { username, password }) => {
    return authService.login(username, password);
  });

  ipcMain.handle('auth:logout', () => {
    authService.logout();
    return { success: true };
  });

  ipcMain.handle('auth:lock', () => {
    authService.lockSession();
    return { success: true };
  });

  ipcMain.handle('auth:unlock', (_, { password }) => {
    return { success: authService.unlockSession(password) };
  });

  ipcMain.handle('auth:getSession', () => {
    return authService.getSession();
  });

  ipcMain.handle('auth:changePassword', (_, { oldPassword, newPassword }) => {
    return authService.changePassword(oldPassword, newPassword);
  });

  ipcMain.handle('auth:verifyRecoveryKey', (_, { username, recoveryKey }) => {
    return { valid: authService.verifyRecoveryKey(username, recoveryKey) };
  });

  ipcMain.handle('auth:resetPassword', (_, { username, recoveryKey, newPassword }) => {
    return authService.resetPasswordWithRecovery(username, recoveryKey, newPassword);
  });

  // College Profile
  ipcMain.handle('college:getProfile', () => {
    const rows = dbService.query<any>('SELECT * FROM college_profile LIMIT 1');
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      logoDataUrl: r.logo_data_url,
      address: r.address,
      district: r.district,
      state: r.state,
      country: r.country,
      email: r.email,
      phone: r.phone,
      website: r.website,
      libraryName: r.library_name,
      libraryDescription: r.library_description,
      updatedAt: r.updated_at,
    };
  });

  ipcMain.handle('college:updateProfile', (_, profile: Partial<CollegeProfile>) => {
    try {
      const now = new Date().toISOString();
      dbService.run(
        `UPDATE college_profile SET
          name = COALESCE(?, name),
          short_name = COALESCE(?, short_name),
          logo_data_url = COALESCE(?, logo_data_url),
          address = COALESCE(?, address),
          district = COALESCE(?, district),
          state = COALESCE(?, state),
          country = COALESCE(?, country),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          website = COALESCE(?, website),
          library_name = COALESCE(?, library_name),
          library_description = COALESCE(?, library_description),
          updated_at = ?
         WHERE id = 'default'`,
        [
          profile.name,
          profile.shortName,
          profile.logoDataUrl,
          profile.address,
          profile.district,
          profile.state,
          profile.country,
          profile.email,
          profile.phone,
          profile.website,
          profile.libraryName,
          profile.libraryDescription,
          now,
        ]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Books
  ipcMain.handle('books:getAll', (_, { search, category }) => {
    return bookService.getAllBooks(search, category);
  });

  ipcMain.handle('books:getById', (_, id: string) => {
    return bookService.getBookById(id);
  });

  ipcMain.handle('books:create', (_, { bookData, copiesData }) => {
    return bookService.createBook(bookData, copiesData);
  });

  ipcMain.handle('books:update', (_, { id, updates }) => {
    return bookService.updateBook(id, updates);
  });

  ipcMain.handle('books:delete', (_, id: string) => {
    return bookService.deleteBook(id);
  });

  ipcMain.handle('books:addCopy', (_, { bookId, copyData }) => {
    return bookService.addCopy(bookId, copyData);
  });

  ipcMain.handle('books:findCopy', (_, identifier: string) => {
    return bookService.findCopyByIdentifier(identifier);
  });

  ipcMain.handle('books:generateLibraryId', () => {
    return bookService.generateNextLibraryId();
  });

  ipcMain.handle('books:generateAccessionNumber', () => {
    return bookService.generateNextAccessionNumber();
  });

  ipcMain.handle('books:bulkImport', (_, rows) => {
    return bookService.bulkImportBooks(rows);
  });

  // Students & Teachers
  ipcMain.handle('patrons:getStudents', (_, { search, department, status }) => {
    return patronService.getAllStudents(search, department, status);
  });

  ipcMain.handle('patrons:createStudent', (_, data) => {
    return patronService.createStudent(data);
  });

  ipcMain.handle('patrons:updateStudent', (_, { id, updates }) => {
    return patronService.updateStudent(id, updates);
  });

  ipcMain.handle('patrons:archiveStudent', (_, id: string) => {
    return patronService.archiveStudent(id);
  });

  ipcMain.handle('patrons:bulkImportStudents', (_, rows) => {
    return patronService.bulkImportStudents(rows);
  });

  ipcMain.handle('patrons:getTeachers', (_, { search, department, status }) => {
    return patronService.getAllTeachers(search, department, status);
  });

  ipcMain.handle('patrons:createTeacher', (_, data) => {
    return patronService.createTeacher(data);
  });

  ipcMain.handle('patrons:updateTeacher', (_, { id, updates }) => {
    return patronService.updateTeacher(id, updates);
  });

  ipcMain.handle('patrons:archiveTeacher', (_, id: string) => {
    return patronService.archiveTeacher(id);
  });

  ipcMain.handle('patrons:bulkImportTeachers', (_, rows) => {
    return patronService.bulkImportTeachers(rows);
  });

  // Transactions (Issue, Return, Renew)
  ipcMain.handle('transactions:issue', (_, params) => {
    return transactionService.issueBook(params);
  });

  ipcMain.handle('transactions:return', (_, params) => {
    return transactionService.returnBook(params);
  });

  ipcMain.handle('transactions:renew', (_, transactionId: string) => {
    return transactionService.renewBook(transactionId);
  });

  ipcMain.handle('transactions:markLostOrDamaged', (_, { copyId, status, fineAmount, notes }) => {
    return transactionService.markLostOrDamaged(copyId, status, fineAmount, notes);
  });

  ipcMain.handle('transactions:getActive', (_, search?: string) => {
    return transactionService.getActiveTransactions(search);
  });

  ipcMain.handle('transactions:getHistory', (_, limit?: number) => {
    return transactionService.getTransactionHistory(limit);
  });

  // Fines
  ipcMain.handle('fines:getAll', (_, { status, search }) => {
    return fineService.getAllFines(status, search);
  });

  ipcMain.handle('fines:pay', (_, { fineId, amountToPay, notes }) => {
    return fineService.payFine(fineId, amountToPay, notes);
  });

  ipcMain.handle('fines:waive', (_, { fineId, reason }) => {
    return fineService.waiveFine(fineId, reason);
  });

  // Reservations
  ipcMain.handle('reservations:getAll', (_, { status, search }) => {
    return reservationService.getAllReservations(status, search);
  });

  ipcMain.handle('reservations:create', (_, params) => {
    return reservationService.createReservation(params);
  });

  ipcMain.handle('reservations:cancel', (_, id: string) => {
    return reservationService.cancelReservation(id);
  });

  // Dashboard Statistics
  ipcMain.handle('dashboard:getStats', (): DashboardStats => {
    const titlesRes = dbService.query<{ cnt: number }>('SELECT COUNT(*) as cnt FROM books');
    const copiesRes = dbService.query<{ total: number; avail: number }>(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as avail FROM book_copies'
    );
    const issuedRes = dbService.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM transactions WHERE status = 'issued'"
    );
    const overdueRes = dbService.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM transactions WHERE status = 'issued' AND datetime(due_date) < datetime('now')"
    );
    const studentsRes = dbService.query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM students WHERE status = 'active'");
    const teachersRes = dbService.query<{ cnt: number }>("SELECT COUNT(*) as cnt FROM teachers WHERE status = 'active'");
    const finesRes = dbService.query<{ total: number }>(
      "SELECT SUM(amount - (paid_amount + waived_amount)) as total FROM fines WHERE status IN ('unpaid', 'partially_paid')"
    );
    const resRes = dbService.query<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM reservations WHERE status IN ('waiting', 'ready_for_pickup')"
    );

    return {
      totalTitles: titlesRes[0]?.cnt || 0,
      totalCopies: copiesRes[0]?.total || 0,
      availableCopies: copiesRes[0]?.avail || 0,
      issuedBooks: issuedRes[0]?.cnt || 0,
      overdueBooks: overdueRes[0]?.cnt || 0,
      totalStudents: studentsRes[0]?.cnt || 0,
      totalTeachers: teachersRes[0]?.cnt || 0,
      pendingFinesAmount: finesRes[0]?.total || 0,
      activeReservations: resRes[0]?.cnt || 0,
    };
  });

  ipcMain.handle('dashboard:getRecentActivities', (_, limit = 15): ActivityLog[] => {
    const rows = dbService.query<any>('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      category: r.category,
      details: r.details,
      status: r.status,
    }));
  });

  ipcMain.handle('dashboard:getMostBorrowed', (_, limit = 5) => {
    return dbService.query(
      `SELECT book_title as title, COUNT(*) as borrow_count 
       FROM transactions 
       GROUP BY book_title 
       ORDER BY borrow_count DESC 
       LIMIT ?`,
      [limit]
    );
  });

  // Settings
  ipcMain.handle('settings:getLibraryConfig', () => {
    const rows = dbService.query<any>('SELECT * FROM library_config LIMIT 1');
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
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
      currency: r.currency,
      categories: JSON.parse(r.categories || '[]'),
      departments: JSON.parse(r.departments || '[]'),
      academicYears: JSON.parse(r.academic_years || '[]'),
    };
  });

  ipcMain.handle('settings:updateLibraryConfig', (_, config: Partial<LibraryConfig>) => {
    try {
      dbService.run(
        `UPDATE library_config SET
          opening_time = COALESCE(?, opening_time),
          closing_time = COALESCE(?, closing_time),
          working_days = COALESCE(?, working_days),
          holidays = COALESCE(?, holidays),
          academic_year = COALESCE(?, academic_year),
          default_issue_duration_days = COALESCE(?, default_issue_duration_days),
          max_books_student = COALESCE(?, max_books_student),
          max_books_teacher = COALESCE(?, max_books_teacher),
          daily_overdue_fine = COALESCE(?, daily_overdue_fine),
          max_fine_per_book = COALESCE(?, max_fine_per_book),
          reservation_expiry_days = COALESCE(?, reservation_expiry_days),
          currency = COALESCE(?, currency),
          categories = COALESCE(?, categories),
          departments = COALESCE(?, departments),
          academic_years = COALESCE(?, academic_years)
         WHERE id = 'default'`,
        [
          config.openingTime,
          config.closingTime,
          config.workingDays ? JSON.stringify(config.workingDays) : null,
          config.holidays ? JSON.stringify(config.holidays) : null,
          config.academicYear,
          config.defaultIssueDurationDays,
          config.maxBooksStudent,
          config.maxBooksTeacher,
          config.dailyOverdueFine,
          config.maxFinePerBook,
          config.reservationExpiryDays,
          config.currency,
          config.categories ? JSON.stringify(config.categories) : null,
          config.departments ? JSON.stringify(config.departments) : null,
          config.academicYears ? JSON.stringify(config.academicYears) : null,
        ]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:getAppearance', () => {
    const rows = dbService.query<any>('SELECT * FROM appearance_settings LIMIT 1');
    if (!rows || rows.length === 0) return { theme: 'light', primaryColor: '#1e40af', sidebarAppearance: 'expanded', tableDensity: 'comfortable' };
    const r = rows[0];
    return {
      theme: r.theme,
      primaryColor: r.primary_color,
      sidebarAppearance: r.sidebar_appearance,
      tableDensity: r.table_density,
    };
  });

  ipcMain.handle('settings:updateAppearance', (_, appearance: Partial<AppearanceSettings>) => {
    try {
      dbService.run(
        `UPDATE appearance_settings SET
          theme = COALESCE(?, theme),
          primary_color = COALESCE(?, primary_color),
          sidebar_appearance = COALESCE(?, sidebar_appearance),
          table_density = COALESCE(?, table_density)
         WHERE id = 'default'`,
        [appearance.theme, appearance.primaryColor, appearance.sidebarAppearance, appearance.tableDensity]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:getAppSettings', () => {
    const rows = dbService.query<any>('SELECT * FROM app_settings LIMIT 1');
    if (!rows || rows.length === 0) return { language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '12 Hours (AM/PM)', autoLockMinutes: 15, loginAttemptLimit: 5, minimizeToTray: false };
    const r = rows[0];
    return {
      language: r.language,
      dateFormat: r.date_format,
      timeFormat: r.time_format,
      autoLockMinutes: Number(r.auto_lock_minutes),
      loginAttemptLimit: Number(r.login_attempt_limit),
      minimizeToTray: Boolean(r.minimize_to_tray),
    };
  });

  ipcMain.handle('settings:updateAppSettings', (_, settings: Partial<AppSettings>) => {
    try {
      dbService.run(
        `UPDATE app_settings SET
          language = COALESCE(?, language),
          date_format = COALESCE(?, date_format),
          time_format = COALESCE(?, time_format),
          auto_lock_minutes = COALESCE(?, auto_lock_minutes),
          login_attempt_limit = COALESCE(?, login_attempt_limit),
          minimize_to_tray = COALESCE(?, minimize_to_tray)
         WHERE id = 'default'`,
        [
          settings.language,
          settings.dateFormat,
          settings.timeFormat,
          settings.autoLockMinutes,
          settings.loginAttemptLimit,
          settings.minimizeToTray !== undefined ? (settings.minimizeToTray ? 1 : 0) : null,
        ]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Backup & Restore
  ipcMain.handle('backup:getConfig', () => backupService.getBackupConfig());
  ipcMain.handle('backup:updateConfig', (_, cfg) => backupService.updateBackupConfig(cfg));
  ipcMain.handle('backup:list', () => backupService.listBackups());
  ipcMain.handle('backup:create', (_, type?: 'manual' | 'automatic', dest?: string) => backupService.createBackup(type, dest));
  ipcMain.handle('backup:restore', async (_, filePath: string) => backupService.restoreBackup(filePath));
  ipcMain.handle('backup:selectDestination', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Backup Destination Folder',
      properties: ['openDirectory'],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('backup:selectRestoreFile', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Encrypted Library Backup File',
      filters: [{ name: 'Backup Files (*.bak)', extensions: ['bak'] }],
      properties: ['openFile'],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  // Updates
  ipcMain.handle('updates:getStatus', () => updateService.getStatus());
  ipcMain.handle('updates:check', () => updateService.checkForUpdates());
  ipcMain.handle('updates:download', () => updateService.downloadUpdate());
  ipcMain.handle('updates:install', () => updateService.quitAndInstall());

  // System Helpers
  ipcMain.handle('system:openFolder', (_, folderPath: string) => {
    shell.openPath(folderPath);
  });

  ipcMain.handle('system:openExternal', (_, targetUrl: string) => {
    if (typeof targetUrl === 'string' && (targetUrl.startsWith('https://') || targetUrl.startsWith('http://'))) {
      shell.openExternal(targetUrl);
    }
  });

  ipcMain.handle('system:getAppInfo', () => ({
    name: 'College Library Manager',
    version: app.getVersion(),
    appDataPath: dbService.getBaseDir(),
    databasePath: path.join(dbService.getSubDir('Database'), 'library.db.enc'),
  }));

  // File Picker for Logo / Covers
  ipcMain.handle('dialog:openImage', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Image (PNG, JPG, WEBP)',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    const filePath = res.filePaths[0];
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).replace('.', '') || 'png';
    return `data:image/${ext};base64,${data.toString('base64')}`;
  });
}
