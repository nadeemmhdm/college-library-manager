import { contextBridge, ipcRenderer } from 'electron';
import {
  InitialSetupPayload,
  CollegeProfile,
  LibraryConfig,
  AppearanceSettings,
  AppSettings,
  Book,
  IdType,
  BorrowerType,
  BackupConfig,
  UpdateInfo,
} from '../shared/types';

const electronAPI = {
  // Window
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Setup Wizard
  getSetupStatus: () => ipcRenderer.invoke('setup:getStatus'),
  generateRecoveryKey: () => ipcRenderer.invoke('setup:generateRecoveryKey'),
  completeSetup: (payload: InitialSetupPayload) => ipcRenderer.invoke('setup:complete', payload),

  // Auth
  login: (credentials: { username: string; password: string }) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  lockSession: () => ipcRenderer.invoke('auth:lock'),
  unlockSession: (credentials: { password: string }) => ipcRenderer.invoke('auth:unlock', credentials),
  getSession: () => ipcRenderer.invoke('auth:getSession'),
  changePassword: (payload: { oldPassword: string; newPassword: string }) => ipcRenderer.invoke('auth:changePassword', payload),
  verifyRecoveryKey: (payload: { username: string; recoveryKey: string }) => ipcRenderer.invoke('auth:verifyRecoveryKey', payload),
  resetPassword: (payload: { username: string; recoveryKey: string; newPassword: string }) => ipcRenderer.invoke('auth:resetPassword', payload),

  // College Profile
  getCollegeProfile: () => ipcRenderer.invoke('college:getProfile'),
  updateCollegeProfile: (profile: Partial<CollegeProfile>) => ipcRenderer.invoke('college:updateProfile', profile),

  // Books
  getBooks: (filters: { search?: string; category?: string } = {}) => ipcRenderer.invoke('books:getAll', filters),
  getBookById: (id: string) => ipcRenderer.invoke('books:getById', id),
  createBook: (data: {
    bookData: Omit<Book, 'id' | 'totalCopies' | 'availableCopies' | 'createdAt' | 'updatedAt'>;
    copiesData: Array<{ idType: IdType; barcode?: string; libraryId?: string; conditionNotes?: string }>;
  }) => ipcRenderer.invoke('books:create', data),
  updateBook: (id: string, updates: Partial<Book>) => ipcRenderer.invoke('books:update', { id, updates }),
  deleteBook: (id: string) => ipcRenderer.invoke('books:delete', id),
  addBookCopy: (data: { bookId: string; copyData: { idType: IdType; barcode?: string; libraryId?: string; conditionNotes?: string } }) =>
    ipcRenderer.invoke('books:addCopy', data),
  findCopy: (identifier: string) => ipcRenderer.invoke('books:findCopy', identifier),
  generateLibraryId: () => ipcRenderer.invoke('books:generateLibraryId'),
  generateAccessionNumber: () => ipcRenderer.invoke('books:generateAccessionNumber'),
  bulkImportBooks: (rows: any[]) => ipcRenderer.invoke('books:bulkImport', rows),

  // Students & Teachers
  getStudents: (filters: { search?: string; department?: string; status?: 'all' | 'active' | 'archived' } = {}) =>
    ipcRenderer.invoke('patrons:getStudents', filters),
  createStudent: (data: any) => ipcRenderer.invoke('patrons:createStudent', data),
  updateStudent: (id: string, updates: any) => ipcRenderer.invoke('patrons:updateStudent', { id, updates }),
  archiveStudent: (id: string) => ipcRenderer.invoke('patrons:archiveStudent', id),
  bulkImportStudents: (rows: any[]) => ipcRenderer.invoke('patrons:bulkImportStudents', rows),

  getTeachers: (filters: { search?: string; department?: string; status?: 'all' | 'active' | 'archived' } = {}) =>
    ipcRenderer.invoke('patrons:getTeachers', filters),
  createTeacher: (data: any) => ipcRenderer.invoke('patrons:createTeacher', data),
  updateTeacher: (id: string, updates: any) => ipcRenderer.invoke('patrons:updateTeacher', { id, updates }),
  archiveTeacher: (id: string) => ipcRenderer.invoke('patrons:archiveTeacher', id),
  bulkImportTeachers: (rows: any[]) => ipcRenderer.invoke('patrons:bulkImportTeachers', rows),

  // Transactions (Issue / Return / Renew)
  issueBook: (params: {
    copyIdentifier: string;
    borrowerType: BorrowerType;
    borrowerIdentifier: string;
    customDurationDays?: number;
    remarks?: string;
  }) => ipcRenderer.invoke('transactions:issue', params),

  returnBook: (params: {
    copyIdentifier: string;
    conditionNotes?: string;
    waiveFine?: boolean;
    finePaid?: number;
  }) => ipcRenderer.invoke('transactions:return', params),

  renewBook: (transactionId: string) => ipcRenderer.invoke('transactions:renew', transactionId),
  markLostOrDamaged: (params: { copyId: string; status: 'lost' | 'damaged'; fineAmount: number; notes?: string }) =>
    ipcRenderer.invoke('transactions:markLostOrDamaged', params),
  getActiveTransactions: (search?: string) => ipcRenderer.invoke('transactions:getActive', search),
  getTransactionHistory: (limit?: number) => ipcRenderer.invoke('transactions:getHistory', limit),

  // Fines
  getFines: (filters: { status?: 'all' | 'unpaid' | 'paid' | 'waived'; search?: string } = {}) =>
    ipcRenderer.invoke('fines:getAll', filters),
  payFine: (params: { fineId: string; amountToPay: number; notes?: string }) => ipcRenderer.invoke('fines:pay', params),
  waiveFine: (params: { fineId: string; reason: string }) => ipcRenderer.invoke('fines:waive', params),

  // Reservations
  getReservations: (filters: { status?: string; search?: string } = {}) => ipcRenderer.invoke('reservations:getAll', filters),
  createReservation: (params: { bookId: string; borrowerType: BorrowerType; borrowerIdentifier: string }) =>
    ipcRenderer.invoke('reservations:create', params),
  cancelReservation: (id: string) => ipcRenderer.invoke('reservations:cancel', id),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:getStats'),
  getRecentActivities: (limit?: number) => ipcRenderer.invoke('dashboard:getRecentActivities', limit),
  getMostBorrowed: (limit?: number) => ipcRenderer.invoke('dashboard:getMostBorrowed', limit),

  // Settings
  getLibraryConfig: () => ipcRenderer.invoke('settings:getLibraryConfig'),
  updateLibraryConfig: (config: Partial<LibraryConfig>) => ipcRenderer.invoke('settings:updateLibraryConfig', config),
  getAppearance: () => ipcRenderer.invoke('settings:getAppearance'),
  updateAppearance: (appearance: Partial<AppearanceSettings>) => ipcRenderer.invoke('settings:updateAppearance', appearance),
  getAppSettings: () => ipcRenderer.invoke('settings:getAppSettings'),
  updateAppSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:updateAppSettings', settings),

  // Backup & Restore
  getBackupConfig: () => ipcRenderer.invoke('backup:getConfig'),
  updateBackupConfig: (config: Partial<BackupConfig>) => ipcRenderer.invoke('backup:updateConfig', config),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  createBackup: (type?: 'manual' | 'automatic', dest?: string) => ipcRenderer.invoke('backup:create', type, dest),
  restoreBackup: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
  selectBackupDestination: () => ipcRenderer.invoke('backup:selectDestination'),
  selectRestoreFile: () => ipcRenderer.invoke('backup:selectRestoreFile'),

  // Updates
  getUpdateStatus: () => ipcRenderer.invoke('updates:getStatus'),
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateStatusChanged: (callback: (status: UpdateInfo) => void) => {
    const sub = (_: any, status: UpdateInfo) => callback(status);
    ipcRenderer.on('update-status-changed', sub);
    return () => ipcRenderer.removeListener('update-status-changed', sub);
  },

  // System
  openFolder: (folderPath: string) => ipcRenderer.invoke('system:openFolder', folderPath),
  openExternalUrl: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  getAppInfo: () => ipcRenderer.invoke('system:getAppInfo'),
  openImageDialog: () => ipcRenderer.invoke('dialog:openImage'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
