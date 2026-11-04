# Release Publishing Guide: College Library Manager

This guide details how to build, tag, and publish official Windows releases using GitHub Actions and GitHub Releases for automated deployment to client machines via `electron-updater`.

---

## 1. Configuring Your GitHub Repository

In `package.json`, locate the `build.publish` field and update the `owner` and `repo` to match your organization's GitHub repository:

```json
"publish": [
  {
    "provider": "github",
    "owner": "YOUR_GITHUB_ORGANIZATION_OR_USERNAME",
    "repo": "YOUR_REPOSITORY_NAME"
  }
]
```

---

## 2. Setting Up GitHub Actions Secret

The GitHub Actions workflow (`.github/workflows/release.yml`) uses the repository's built-in `GITHUB_TOKEN` to publish releases. Ensure write permissions are granted:

1. In your GitHub repository, navigate to **Settings > Actions > General**.
2. Scroll to **Workflow permissions**.
3. Select **Read and write permissions**.
4. Check **Allow GitHub Actions to create and approve pull requests**.
5. Click **Save**.

---

## 3. Creating and Publishing a New Release

To publish a new release:

1. **Update Version**: In `package.json`, increment the version (e.g., from `1.0.0` to `1.1.0`):
   ```json
   "version": "1.1.0"
   ```

2. **Commit and Push**:
   ```bash
   git add package.json
   git commit -m "Release v1.1.0"
   git push origin main
   ```

3. **Tag the Release**:
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

4. **Automated CI/CD Execution**:
   - The GitHub Actions runner will trigger automatically on the `v*` tag push.
   - It will install dependencies, build the React frontend and Electron processes, and run `electron-builder --win nsis`.
   - The generated `CollegeLibraryManager-Setup-x64.exe`, `latest.yml`, and blockmap files will be uploaded directly to the new GitHub Release.

---

## 4. How Client Applications Receive Updates

1. When librarians open the application (or navigate to the **Updates** tab), `electron-updater` queries:
   ```
   https://github.com/OWNER/REPO/releases/latest/download/latest.yml
   ```
2. If `latest.yml` reports a higher version than the currently installed version:
   - A banner notification will appear: **"New Update Available: v1.1.0"**.
   - The librarian can click **Download Update**.
   - Download progress will display in real time.
   - Once completed, clicking **Restart & Install** will close the app, launch the NSIS installer in silent mode, apply the update, and relaunch the application.
3. **Data Integrity Guarantee**: All existing database records, configurations, and college branding in `%APPDATA%/CollegeLibraryManager/` remain completely untouched.
