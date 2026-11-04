import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { LibrarianAccount, ActivityLog } from '../../shared/types';

export class AuthService {
  private dbService: DatabaseService;
  private currentSession: {
    username: string;
    fullName: string;
    loginTime: string;
    isLocked: boolean;
  } | null = null;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  // Cryptographically secure password hash using PBKDF2 with 100,000 iterations and sha512
  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
  }

  // Generate cryptographically secure recovery key formatted as CLMR-XXXX-XXXX-XXXX-XXXX
  public generateRecoveryKey(): string {
    const bytes = crypto.randomBytes(16);
    const hex = bytes.toString('hex').toUpperCase();
    const parts = hex.match(/.{1,4}/g) || [];
    return `CLMR-${parts.join('-')}`;
  }

  // Create recovery verifier (SHA-256 hash with salt - never store plaintext key)
  public hashRecoveryKey(recoveryKey: string, salt?: string): { verifier: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const cleaned = recoveryKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const verifier = crypto.createHmac('sha256', s).update(cleaned).digest('hex');
    return { verifier, salt: s };
  }

  // Verify recovery key
  public verifyRecoveryKey(username: string, recoveryKey: string): boolean {
    const accounts = this.dbService.query<any>(
      'SELECT * FROM librarian_account WHERE username = ?',
      [username]
    );
    if (!accounts || accounts.length === 0) return false;
    const acc = accounts[0];

    const recoverySalt = acc.recovery_salt || acc.recoverySalt;
    const recoveryVerifier = acc.recovery_verifier || acc.recoveryVerifier;
    if (!recoverySalt || !recoveryVerifier) return false;

    const cleaned = recoveryKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const expected = crypto.createHmac('sha256', recoverySalt).update(cleaned).digest('hex');

    const match = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(recoveryVerifier, 'hex'));
    if (match) {
      this.logAuthActivity('RECOVERY_VERIFIED', `Recovery key verified for user: ${username}`, 'success');
    } else {
      this.logAuthActivity('RECOVERY_FAILED', `Invalid recovery key attempt for user: ${username}`, 'warning');
    }
    return match;
  }

  // Reset password via verified recovery key
  public resetPasswordWithRecovery(username: string, recoveryKey: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.verifyRecoveryKey(username, recoveryKey)) {
      return { success: false, error: 'Invalid recovery key.' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const { hash, salt } = this.hashPassword(newPassword);
    this.dbService.run(
      `UPDATE librarian_account 
       SET password_hash = ?, password_salt = ?, failed_login_attempts = 0, locked_until = NULL 
       WHERE username = ?`,
      [hash, salt, username]
    );

    this.logAuthActivity('PASSWORD_RESET', `Password successfully reset using recovery key for ${username}`, 'success');
    return { success: true };
  }

  // Librarian Login with rate limiting
  public login(username: string, password: string): { success: boolean; error?: string; user?: any } {
    const accounts = this.dbService.query<any>(
      'SELECT * FROM librarian_account WHERE username = ?',
      [username]
    );

    if (!accounts || accounts.length === 0) {
      this.logAuthActivity('LOGIN_FAILED', `Login attempt for non-existent user: ${username}`, 'warning');
      return { success: false, error: 'Invalid username or password.' };
    }

    const acc = accounts[0];
    const passwordHash = acc.password_hash || acc.passwordHash;
    const passwordSalt = acc.password_salt || acc.passwordSalt;
    const lockedUntilVal = acc.locked_until || acc.lockedUntil;
    const failedAttemptsVal = acc.failed_login_attempts ?? acc.failedLoginAttempts ?? 0;
    const userFullName = acc.full_name || acc.fullName || acc.username;
    const lastLoginAtVal = acc.last_login_at || acc.lastLoginAt;

    if (!passwordHash || !passwordSalt) {
      this.logAuthActivity('LOGIN_ERROR', `Missing password hash or salt for user: ${username}`, 'error');
      return { success: false, error: 'Account credentials error. Please reset your password using the recovery key.' };
    }

    // Check account lockout
    if (lockedUntilVal) {
      const lockTime = new Date(lockedUntilVal).getTime();
      if (Date.now() < lockTime) {
        const remainingMinutes = Math.ceil((lockTime - Date.now()) / (60 * 1000));
        return {
          success: false,
          error: `Account is locked due to multiple failed attempts. Please wait ${remainingMinutes} minute(s) or use account recovery.`,
        };
      } else {
        // Lock expired, reset
        this.dbService.run('UPDATE librarian_account SET locked_until = NULL, failed_login_attempts = 0 WHERE username = ?', [username]);
      }
    }

    const { hash } = this.hashPassword(password, passwordSalt);
    const valid = crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(passwordHash, 'hex'));

    if (!valid) {
      const attempts = failedAttemptsVal + 1;
      let lockedUntil: string | null = null;
      if (attempts >= 5) {
        // Lock for 15 minutes
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      this.dbService.run(
        'UPDATE librarian_account SET failed_login_attempts = ?, locked_until = ? WHERE username = ?',
        [attempts, lockedUntil, username]
      );

      this.logAuthActivity('LOGIN_FAILED', `Failed login attempt (${attempts}) for user: ${username}`, 'warning');

      if (lockedUntil) {
        return { success: false, error: 'Account locked for 15 minutes due to 5 consecutive failed attempts.' };
      }
      return { success: false, error: `Invalid credentials. (${5 - attempts} attempts remaining)` };
    }

    // Success
    const now = new Date().toISOString();
    this.dbService.run(
      'UPDATE librarian_account SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ? WHERE username = ?',
      [now, username]
    );

    this.currentSession = {
      username: acc.username,
      fullName: userFullName,
      loginTime: now,
      isLocked: false,
    };

    this.logAuthActivity('LOGIN_SUCCESS', `Librarian ${username} logged in successfully`, 'success');
    return {
      success: true,
      user: {
        username: acc.username,
        fullName: userFullName,
        lastLoginAt: lastLoginAtVal,
      },
    };
  }

  public lockSession(): void {
    if (this.currentSession) {
      this.currentSession.isLocked = true;
      this.logAuthActivity('SESSION_LOCKED', `Session locked for user: ${this.currentSession.username}`, 'success');
    }
  }

  public unlockSession(password: string): boolean {
    if (!this.currentSession) return false;
    const result = this.login(this.currentSession.username, password);
    if (result.success) {
      this.currentSession.isLocked = false;
      return true;
    }
    return false;
  }

  public logout(): void {
    if (this.currentSession) {
      this.logAuthActivity('LOGOUT', `User ${this.currentSession.username} logged out`, 'success');
      this.currentSession = null;
    }
  }

  public getSession(): typeof this.currentSession {
    return this.currentSession;
  }

  public changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!this.currentSession) return { success: false, error: 'No active session.' };
    const res = this.login(this.currentSession.username, oldPassword);
    if (!res.success) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    const { hash, salt } = this.hashPassword(newPassword);
    this.dbService.run(
      'UPDATE librarian_account SET password_hash = ?, password_salt = ? WHERE username = ?',
      [hash, salt, this.currentSession.username]
    );

    this.logAuthActivity('PASSWORD_CHANGED', `Password changed for user ${this.currentSession.username}`, 'success');
    return { success: true };
  }

  public logAuthActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.dbService.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'auth', details, status]
      );
    } catch {}
  }
}
