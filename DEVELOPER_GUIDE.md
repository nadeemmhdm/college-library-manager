# Developer Guide: College Library Manager

This document provides architectural documentation, coding conventions, and maintenance guidelines for developers contributing to or maintaining **College Library Manager**.

---

## 1. Architecture Overview

College Library Manager enforces strict process separation between the Electron Main process and the React Renderer process.

```
┌────────────────────────────────────────────────────────┐
│                   Electron Main Process                │
│  - Window Management & Native Frameless Titlebar       │
│  - SQLite Engine (sql.js WebAssembly)                  │
│  - Encryption Layer (AES-256-GCM + Windows DPAPI)       │
│  - Scheduled Backup Service & File Integrity Engine    │
│  - Auto-Updater (electron-updater + GitHub Releases)   │
└──────────────────────────┬─────────────────────────────┘
                           │ IPC via contextBridge
┌──────────────────────────▼─────────────────────────────┐
│                    Preload Script                      │
│  - window.electronAPI                                  │
│  - Strictly isolated (nodeIntegration: false)          │
└──────────────────────────┬─────────────────────────────┘
                           │ Type-Safe API calls
┌──────────────────────────▼─────────────────────────────┐
│                   React Renderer Process               │
│  - Vite + React 18 + TypeScript                        │
│  - Tailwind CSS + Boxicons / Lucide Icons              │
│  - Complete Views & Forms (Issue, Return, Inventory)   │
│  - Inactivity Auto-Lock & Keyboard Shortcut Listeners  │
│  - PDF & Thermal Receipt Generator (jsPDF)             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
Libreary MGMS/
├── .github/
│   └── workflows/
│       └── release.yml          # GitHub Actions tag-based release pipeline
├── dist/                        # Compiled React production bundle
├── dist-electron/               # Compiled TypeScript Electron main & preload
├── scripts/
│   └── test-engine.js           # Automated integration test suite
├── src/
│   ├── main/
│   │   ├── db/
│   │   │   └── database.ts      # SQLite WebAssembly, encryption & migration manager
│   │   ├── services/
│   │   │   ├── authService.ts   # Password hashing & recovery verifier
│   │   │   ├── bookService.ts   # Multi-copy & Smart ID generation
│   │   │   ├── patronService.ts # Student & faculty CRUD
│   │   │   ├── transactionService.ts # Issue, return, renew & fine calc
│   │   │   ├── fineService.ts   # Collection, receipts & waivers
│   │   │   ├── reservationService.ts # Queue positioning & allocation
│   │   │   ├── backupService.ts # Local, USB & automated snapshots
│   │   │   └── updateService.ts # electron-updater GitHub listener
│   │   └── main.ts              # Electron lifecycle & IPC handlers
│   ├── preload/
│   │   └── preload.ts           # Secure contextBridge exposure
│   ├── renderer/
│   │   ├── components/
│   │   │   ├── auth/            # LoginScreen, LockScreen
│   │   │   ├── common/          # GlobalSearchModal
│   │   │   ├── setup/           # 8-Step SetupWizard
│   │   │   └── views/           # All application view screens
│   │   ├── types/
│   │   │   └── electron.d.ts    # Global window.electronAPI declarations
│   │   ├── utils/
│   │   │   └── printUtils.ts    # jsPDF slip, ID card & barcode labels
│   │   ├── App.tsx              # Central state & navigation controller
│   │   ├── index.css            # Tailwind layers & print styles
│   │   └── main.tsx             # React entry point
│   └── shared/
│       └── types.ts             # Shared data interfaces across processes
├── package.json                 # Scripts, build configurations & dependencies
├── tsconfig.json                # Renderer TypeScript configuration
├── tsconfig.electron.json       # Electron TypeScript configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## 3. Database & Security Implementation

### A. SQLite WebAssembly (`sql.js`)
Rather than relying on fragile native C++ addons (`node-gyp`) that often fail across Windows build environments without Visual Studio, this application uses the WebAssembly port of the official SQLite engine (`sql.js`). It executes 100% of the standard SQLite specification:
- ACID Transactions
- Foreign Key Constraints (`PRAGMA foreign_keys = ON;`)
- Database Integrity Checks (`PRAGMA integrity_check;`)
- B-Tree Indexes on all primary search terms

### B. Two-Tier Encryption Architecture
1. **Master Encryption Key**:
   - A 256-bit random AES key generated at initialization.
   - Encrypted at rest using Windows Data Protection API (DPAPI) via Electron's `safeStorage`.
   - Stored in `%APPDATA%/CollegeLibraryManager/Config/master.key`.
2. **Database At Rest**:
   - Persisted as `%APPDATA%/CollegeLibraryManager/Database/library.db.enc`.
   - Encrypted with AES-256-GCM using random 12-byte initialization vectors and 16-byte authentication tags.
   - Decrypted only in memory while the application is actively running.
3. **Emergency Account Recovery**:
   - 128-bit key formatted as `CLMR-XXXX-XXXX-XXXX-XXXX`.
   - Salted with unique 16-byte random salt and hashed using HMAC-SHA256 (`recovery_verifier`).
   - Plaintext recovery keys are **never stored** on disk or in the database.

---

## 4. Running Tests

Execute the automated test suite:
```powershell
node scripts/test-engine.js
```
All 8 integration tests verify database initialization, AES-256-GCM encryption, schema migrations, Smart ID generation, duplicate accession blocking, book loan limits, overdue fine calculations, and recovery key verification.
