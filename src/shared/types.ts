export type ThemeMode = 'light' | 'dark' | 'system';
export type TableDensity = 'compact' | 'comfortable';
export type SidebarAppearance = 'expanded' | 'compact';

export interface CollegeProfile {
  id: string;
  name: string;
  shortName: string;
  logoDataUrl?: string;
  address: string;
  district: string;
  state: string;
  country: string;
  email: string;
  phone: string;
  website?: string;
  libraryName: string;
  libraryDescription?: string;
  updatedAt: string;
}

export interface LibraryConfig {
  openingTime: string;
  closingTime: string;
  workingDays: string[];
  holidays: string[];
  academicYear: string;
  defaultIssueDurationDays: number;
  maxBooksStudent: number;
  maxBooksTeacher: number;
  dailyOverdueFine: number;
  maxFinePerBook: number;
  reservationExpiryDays: number;
  currency: string;
  categories: string[];
  departments: string[];
  academicYears: string[];
}

export interface LibrarianAccount {
  username: string;
  fullName: string;
  passwordHash: string;
  passwordSalt: string;
  recoveryVerifier: string;
  recoverySalt: string;
  createdAt: string;
  lastLoginAt?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  primaryColor: string;
  sidebarAppearance: SidebarAppearance;
  tableDensity: TableDensity;
}

export interface BackupConfig {
  autoBackupEnabled: boolean;
  frequency: 'daily' | 'weekly';
  backupTime: string;
  backupRetentionCount: number;
  backupDestination: string;
  externalDrivePath?: string;
  lastBackupAt?: string;
}

export interface AppSettings {
  language: string;
  dateFormat: string;
  timeFormat: string;
  autoLockMinutes: number;
  loginAttemptLimit: number;
  minimizeToTray: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  edition: string;
  publicationYear: number;
  category: string;
  subject: string;
  language: string;
  description: string;
  coverImage?: string;
  rackNumber: string;
  shelfLocation: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
}

export type CopyStatus = 'available' | 'issued' | 'reserved' | 'lost' | 'damaged';
export type IdType = 'barcode' | 'auto_lib_id' | 'manual_lib_id';

export interface BookCopy {
  id: string;
  bookId: string;
  accessionNumber: string;
  barcode: string;
  libraryId: string;
  idType: IdType;
  status: CopyStatus;
  addedDate: string;
  conditionNotes?: string;
  bookTitle?: string;
  author?: string;
  rackNumber?: string;
  shelfLocation?: string;
}

export interface Student {
  id: string;
  admissionNumber: string;
  fullName: string;
  department: string;
  academicYear: string;
  semester: string;
  phone: string;
  email: string;
  status: 'active' | 'archived';
  currentIssuesCount: number;
  createdAt: string;
}

export interface Teacher {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  status: 'active' | 'archived';
  currentIssuesCount: number;
  createdAt: string;
}

export type BorrowerType = 'student' | 'teacher';
export type TransactionStatus = 'issued' | 'returned' | 'overdue' | 'lost' | 'damaged';

export interface BookTransaction {
  id: string;
  copyId: string;
  bookId: string;
  bookTitle: string;
  accessionNumber: string;
  libraryId: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerIdentifier: string; // admissionNumber or employeeId
  borrowerName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: TransactionStatus;
  renewalsCount: number;
  overdueDays: number;
  fineCalculated: number;
  finePaid: number;
  remarks?: string;
}

export interface FineRecord {
  id: string;
  transactionId?: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerIdentifier: string;
  borrowerName: string;
  reason: 'overdue' | 'lost' | 'damaged' | 'other';
  amount: number;
  paidAmount: number;
  waivedAmount: number;
  status: 'unpaid' | 'paid' | 'waived' | 'partially_paid';
  dateAssessed: string;
  dateSettled?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerType: BorrowerType;
  borrowerId: string;
  borrowerIdentifier: string;
  borrowerName: string;
  reservationDate: string;
  expiryDate: string;
  status: 'waiting' | 'ready_for_pickup' | 'fulfilled' | 'cancelled' | 'expired';
  queuePosition: number;
  allocatedCopyId?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'issue' | 'return' | 'book' | 'student' | 'teacher' | 'fine' | 'backup' | 'system' | 'update';
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface DashboardStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  issuedBooks: number;
  overdueBooks: number;
  totalStudents: number;
  totalTeachers: number;
  pendingFinesAmount: number;
  activeReservations: number;
}

export interface BackupItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  createdAt: string;
  type: 'automatic' | 'manual' | 'pre-update' | 'pre-restore';
  encrypted: boolean;
  checksum: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  downloadProgress?: number;
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  lastChecked?: string;
  errorMessage?: string;
}

export interface InitialSetupPayload {
  college: Omit<CollegeProfile, 'id' | 'updatedAt'>;
  library: LibraryConfig;
  librarian: {
    fullName: string;
    username: string;
    password: string;
  };
  recoveryKey: string;
  appearance: AppearanceSettings;
  backup: BackupConfig;
}
