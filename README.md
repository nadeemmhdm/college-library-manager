# College Library Manager 📚

> **Complete Offline-First Windows Desktop Library Management Software for College Libraries**

![Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?style=flat&logo=windows)
![Electron](https://img.shields.io/badge/Runtime-Electron%2034-47848F?style=flat&logo=electron)
![React](https://img.shields.io/badge/UI-React%2018%20%2B%20Tailwind-61DAFB?style=flat&logo=react)
![Database](https://img.shields.io/badge/Database-SQLite%20(AES--256--GCM)-003B57?style=flat&logo=sqlite)
![Installer](https://img.shields.io/badge/Installer-NSIS%20x64%20EXE-blue)

**College Library Manager** is an enterprise-grade, offline-first Windows desktop application tailored exclusively for collegiate librarians. It provides end-to-end administration of book cataloging, multiple physical copy tracking with smart identification (Barcodes, Automatic Library IDs, Manual IDs), patron circulation, overdue fine calculations, reservations queues, institutional reports, and automated encrypted backups.

---

## 🌟 Key Features

### 1. First-Time Setup Wizard (8 Steps)
- **Step 1: Welcome**: Introduction to system capabilities.
- **Step 2: College Information**: Capture college full name, short name, upload/crop college logo, campus address, official contact details, and library description.
- **Step 3: Library Configuration**: Configure circulation limits (student vs faculty loan caps), default duration, daily overdue fines, max fine ceilings, academic year, and working hours.
- **Step 4: Librarian Account Creation**: Secure administrative account creation protected by salted cryptographic password hashing (Argon2id/PBKDF2).
- **Step 5: Account Recovery Setup**: Generates a 128-bit cryptographic recovery key (`CLMR-XXXX-XXXX-XXXX-XXXX`). Stores only a salted HMAC-SHA256 verifier—never plaintext.
- **Step 6: Application Appearance**: Choose Light, Dark, or System themes, and customize primary accent colors with live UI preview.
- **Step 7: Automated Backup Setup**: Configure daily/weekly backup schedules, retention thresholds, and local or external USB destinations.
- **Step 8: Completion Summary**: Review configuration, celebrates initialization, and transitions seamlessly to the librarian console.

### 2. High-Security Authentication & Recovery
- **Rate-Limited Login**: Protects against brute-force attacks by automatically locking the account for 15 minutes after 5 consecutive failed attempts.
- **Cryptographic Recovery**: Emergency password reset using the 128-bit emergency recovery key without deleting any library data.
- **Session Auto-Lock**: Configurable inactivity timer locks the console when unattended, requiring master credentials to unlock.
- **Audit Trails**: Full transaction and security activity logging saved to disk and database.

### 3. Smart Book Identification (3 Methods)
- **Method A: Existing Barcodes**: Scan commercial ISBN/EAN barcodes directly using standard USB HID barcode scanners.
- **Method B: Automatic Library IDs**: Automatically generates sequential accession codes (e.g., `LIB-000001`, `ACC-000001`).
- **Method C: Manual Library IDs**: Custom alphanumeric shelving and catalog codes with strict uniqueness validation.
- **Spine & Barcode Labels**: Generate and print standardized 50mm x 30mm barcode labels directly from the app.

### 4. Patron Circulation & Fine Engine
- **Students & Faculty Management**: Separate limits for students (e.g., 3 books) and teachers (e.g., 10 books).
- **Real-Time Overdue Calculation**: Automatically calculates overdue days and fines based on daily rates and caps.
- **Fine Payments & Waivers**: Collect full or partial payments with instant printable receipts, or grant discretionary waivers with recorded reasons.
- **Printable Receipts**: Thermal slip format (80mm) for book issues and returns with student details and due dates.
- **Student ID Cards**: Generate and print standard CR80 library cards complete with patron barcodes.

### 5. Encrypted Persistence & Backup Architecture
- **Location**: `%APPDATA%/CollegeLibraryManager/` (persists across uninstalls and app updates).
- **Encryption**: AES-256-GCM encryption with keys protected by Windows DPAPI (`safeStorage`).
- **Automated Snapshots**: Scheduled daily/weekly backups and automatic safety snapshots prior to any database restoration.
- **Safe Rollback**: Pre-restore integrity verification ensures corrupted backup files cannot compromise operational data.

### 6. GitHub Releases Update Pipeline
- Integrated with `electron-updater` and GitHub Releases.
- Checks for updates, downloads NSIS delta installers, displays release notes, and prompts for restart.
- Guaranteed offline fallback when no internet connection is present.

---

## 🚀 Quick Start (Development)

### Prerequisites
- Windows 10 or 11 (64-bit)
- Node.js 18+ (tested on Node 22 and 24)
- npm or pnpm

### Installation
```powershell
# Clone the repository
git clone https://github.com/nadeemmhdm/college-library-manager.git
cd "college-library-manager"

# Install dependencies
npm install

# Start development environment (Vite + Electron)
npm run electron:dev
```

### Production Build & Packaging
```powershell
# Run all integration tests
node scripts/test-engine.js

# Build React renderer and Electron TypeScript
npm run build

# Package Windows NSIS EXE Installer & Portable Executable
npm run dist
```
The installer will be generated in `release/CollegeLibraryManager-Setup-x64.exe` alongside `release/CollegeLibraryManager-Portable-x64.exe`.

---

## 🔄 GitHub Actions CI/CD & Automated Releases

The repository is configured with an automated dual-mode Windows packaging workflow (`.github/workflows/build-windows.yml`):

### Mode A: Automatic Build Artifacts on Push
- Any commit pushed to the `main` branch automatically triggers a Windows x64 build.
- Runs the test engine, compiles the frontend/backend, creates the NSIS installer and portable executable, generates SHA-256 checksums, and uploads them as GitHub Actions downloadable artifacts.

### Mode B: Automatic GitHub Release on Tag
- Pushing a version tag (e.g. `v1.0.0`, `v1.0.1`) triggers an official GitHub Release:
```powershell
git tag v1.0.0
git push origin v1.0.0
```
- Automatically creates a GitHub Release with auto-generated release notes and attaches:
  - `CollegeLibraryManager-Setup-x64.exe` (NSIS Installer)
  - `CollegeLibraryManager-Portable-x64.exe` (Portable Executable)
  - `latest.yml` (Electron Updater manifest)
  - `.blockmap` (Delta updater data)
  - `SHA256SUMS.txt` (Cryptographic verification checksums)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` | Open Global Search (Books, Students, Faculty, Loans) |
| `Ctrl + B` | Open Book Catalog |
| `Ctrl + I` | Quick Book Issue Screen |
| `Ctrl + R` | Quick Book Return Screen |
| `Ctrl + L` | Lock Librarian Session |
| `Ctrl + ,` | Open Application Settings |

---

## 📄 License
MIT License. Developed for collegiate libraries.
