# Installation Guide: College Library Manager

This guide covers installing and deploying **College Library Manager** on Windows 10 and Windows 11 desktop systems.

---

## 1. System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit architecture)
- **RAM**: Minimum 4 GB (8 GB recommended)
- **Disk Space**: 500 MB free hard disk space
- **Hardware Peripherals (Optional)**:
  - Standard USB HID Barcode Scanner (Plug-and-play, no drivers needed)
  - 80mm Thermal Receipt Printer (for circulation slips)
  - Standard Desktop Printer (for Student ID cards and reports)
- **Internet**: Not required! Works 100% offline.

---

## 2. Installing via the Windows EXE Installer

1. Download `CollegeLibraryManager-Setup-x64.exe` from the college IT repository or official GitHub Releases page.
2. Double-click `CollegeLibraryManager-Setup-x64.exe` to launch the NSIS Installer.
3. **Choose Installation Options**:
   - Choose whether to install for "Anyone who uses this computer (all users)" or "Only for me".
   - Select installation destination folder (default: `C:\Program Files\College Library Manager`).
4. Click **Install**.
5. Once installation finishes, check **Run College Library Manager** and click **Finish**.
6. The installer places a shortcut on your Desktop and in the Windows Start Menu.

---

## 3. First-Time Setup Instructions

On the very first launch, the application will display the **8-Step Setup Wizard**:

1. **Step 1 (Welcome)**: Click **Get Started**.
2. **Step 2 (College Information)**: Enter your institution's name (e.g., `Government Engineering College`), short name, and upload the college logo.
3. **Step 3 (Library Rules)**: Set default book loan duration (e.g., 14 days), borrowing limits (Students: 3, Faculty: 10), and daily overdue fine amount (e.g., ₹2.00/day).
4. **Step 4 (Librarian Administrator)**: Create your master administrator account with full name, username, and a strong password.
5. **Step 5 (Emergency Recovery Key)**:
   - A unique 128-bit cryptographic key will be generated (format: `CLMR-XXXX-XXXX-XXXX-XXXX`).
   - Click **Copy Key** or **Print Document**.
   - Store this key in your college's administrative physical vault or safe.
   - Check the confirmation box to proceed.
6. **Step 6 (Appearance)**: Select your preferred theme (Light, Dark, or System) and primary accent color.
7. **Step 7 (Backup Configuration)**: Confirm the automated backup schedule (default: Daily at 23:00 with 14-day retention).
8. **Step 8 (Launch)**: Review the configuration summary and click **Open Library Dashboard**.

---

## 4. Where Is Your Library Data Stored?

Your entire library database, backups, book covers, and logs are persisted strictly outside the installation folder in:

```
%APPDATA%\CollegeLibraryManager\
├── Database\
│   └── library.db.enc       (AES-256 encrypted SQLite database)
├── Config\
│   └── master.key           (Windows DPAPI-protected encryption key)
├── Backups\                 (Automated and manual snapshots)
├── BookCovers\              (Cached cover images)
├── Documents\               (Generated reports and receipts)
└── Logs\                    (Daily rolling audit logs)
```

### Data Safety Guarantee:
- Updating or uninstalling the application **never** deletes your library records unless you deliberately choose to remove AppData.
- Re-installing the application immediately detects your existing database and credentials.

---

## 5. Uninstallation

To remove the software:
1. Open Windows **Settings > Apps > Installed apps** (or Control Panel > Programs and Features).
2. Select **College Library Manager** and click **Uninstall**.
3. Follow the uninstallation prompts. By default, your database in `%APPDATA%\CollegeLibraryManager\` is preserved.
