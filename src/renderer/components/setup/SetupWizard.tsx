import React, { useState, useEffect } from 'react';
import {
  Building2,
  BookOpen,
  UserCheck,
  KeyRound,
  Palette,
  HardDrive,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Copy,
  Printer,
  Eye,
  EyeOff,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { InitialSetupPayload } from '../../../shared/types';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<InitialSetupPayload>({
    college: {
      name: '',
      shortName: '',
      logoDataUrl: '',
      address: '',
      district: '',
      state: '',
      country: 'India',
      email: '',
      phone: '',
      website: '',
      libraryName: 'Central College Library',
      libraryDescription: 'Main Academic Library & Information Center',
    },
    library: {
      openingTime: '08:30',
      closingTime: '17:30',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      holidays: ['Sunday'],
      academicYear: '2026-2027',
      defaultIssueDurationDays: 14,
      maxBooksStudent: 3,
      maxBooksTeacher: 10,
      dailyOverdueFine: 2.0,
      maxFinePerBook: 200.0,
      reservationExpiryDays: 3,
      currency: '₹',
      categories: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Mathematics', 'Physics', 'Literature'],
      departments: ['Computer Science', 'Information Technology', 'Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Sciences & Humanities'],
      academicYears: ['2025-2026', '2026-2027'],
    },
    librarian: {
      fullName: '',
      username: '',
      password: '',
    },
    recoveryKey: '',
    appearance: {
      theme: 'light',
      primaryColor: '#2563eb',
      sidebarAppearance: 'expanded',
      tableDensity: 'comfortable',
    },
    backup: {
      autoBackupEnabled: true,
      frequency: 'daily',
      backupTime: '23:00',
      backupRetentionCount: 14,
      backupDestination: '',
    },
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch cryptographic recovery key from main process when reaching step 5
  useEffect(() => {
    if (currentStep === 5 && !formData.recoveryKey) {
      window.electronAPI.generateRecoveryKey().then(key => {
        setFormData(prev => ({ ...prev, recoveryKey: key }));
      });
    }
  }, [currentStep]);

  // Handle logo upload
  const handleLogoUpload = async () => {
    try {
      const dataUrl = await window.electronAPI.openImageDialog();
      if (dataUrl) {
        setFormData(prev => ({
          ...prev,
          college: { ...prev.college, logoDataUrl: dataUrl },
        }));
      }
    } catch (e: any) {
      setError('Failed to load image.');
    }
  };

  // Password strength calculator
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdScore = calculatePasswordStrength(formData.librarian.password);

  // Step Validation
  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 2) {
      if (!formData.college.name.trim()) {
        setError('College Name is required.');
        return false;
      }
      if (!formData.college.shortName.trim()) {
        setError('College Short Name is required.');
        return false;
      }
      if (!formData.college.libraryName.trim()) {
        setError('Library Name is required.');
        return false;
      }
    } else if (step === 3) {
      if (formData.library.defaultIssueDurationDays <= 0) {
        setError('Issue duration must be at least 1 day.');
        return false;
      }
      if (formData.library.maxBooksStudent <= 0 || formData.library.maxBooksTeacher <= 0) {
        setError('Borrowing limits must be greater than zero.');
        return false;
      }
    } else if (step === 4) {
      if (!formData.librarian.fullName.trim()) {
        setError('Librarian Full Name is required.');
        return false;
      }
      if (!formData.librarian.username.trim() || formData.librarian.username.length < 3) {
        setError('Username must be at least 3 characters.');
        return false;
      }
      if (formData.librarian.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return false;
      }
      if (formData.librarian.password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
    } else if (step === 5) {
      if (!recoveryConfirmed) {
        setError('Please confirm that you have securely saved your Recovery Key.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 7) {
        confetti({ particleCount: 80, spread: 60 });
      }
      setCurrentStep(prev => Math.min(prev + 1, 8));
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.completeSetup(formData);
      if (res.success) {
        confetti({ particleCount: 150, spread: 80 });
        setTimeout(() => {
          onComplete();
        }, 1200);
      } else {
        setError(res.error || 'Failed to complete setup.');
      }
    } catch (e: any) {
      setError(e.message || 'Error saving initial setup.');
    } finally {
      setLoading(false);
    }
  };

  const primaryColors = [
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Emerald Green', hex: '#059669' },
    { name: 'Deep Purple', hex: '#7c3aed' },
    { name: 'Teal Cyan', hex: '#0d9488' },
    { name: 'Crimson Red', hex: '#dc2626' },
    { name: 'Slate Gray', hex: '#475569' },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-slate-900 flex flex-col justify-between text-slate-100 p-6">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">College Library Manager</h1>
            <p className="text-xs text-slate-400">First-Time System Initialization & College Setup</p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-slate-300">
          Step {currentStep} of 8
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-4xl mx-auto w-full my-6 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-2xl flex-1 flex flex-col justify-between">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Welcome Screen */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <img
              src="./logo.svg"
              alt="College Library Manager Logo"
              className="w-24 h-24 object-contain shadow-2xl shadow-blue-500/30 mb-6 rounded-2xl"
            />
            <h2 className="text-3xl font-extrabold text-white mb-3">Welcome to College Library Manager</h2>
            <p className="text-slate-400 max-w-lg mb-8 text-sm leading-relaxed">
              A high-security, offline-first desktop solution crafted specifically for collegiate librarians. Complete book tracking, smart barcode identification, patron management, and automated encrypted backups.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl w-full text-left mb-8">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-blue-400 text-sm mb-1">100% Offline</div>
                <div className="text-xs text-slate-400">Works without internet; your data stays safely on campus.</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-emerald-400 text-sm mb-1">Encrypted DB</div>
                <div className="text-xs text-slate-400">Windows DPAPI-protected AES-256 local database.</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-semibold text-purple-400 text-sm mb-1">Smart ID</div>
                <div className="text-xs text-slate-400">Scans barcodes or auto-generates library IDs.</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: College Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-blue-500" />
                <span>College Branding & Details</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">This branding appears on your login screen, reports, student ID cards, and receipts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Logo Upload Box */}
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 text-center">
                {formData.college.logoDataUrl ? (
                  <div className="space-y-3">
                    <img
                      src={formData.college.logoDataUrl}
                      alt="College Logo"
                      className="w-28 h-28 object-contain mx-auto rounded-lg border border-slate-700 bg-white/5 p-2"
                    />
                    <button
                      type="button"
                      onClick={handleLogoUpload}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      Change Logo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs text-slate-400">Upload College Logo (PNG/JPG)</div>
                    <button
                      type="button"
                      onClick={handleLogoUpload}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200"
                    >
                      Select Image
                    </button>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">College Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Government Engineering College"
                    value={formData.college.name}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, name: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Short Name / Acronym *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GEC"
                    value={formData.college.shortName}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, shortName: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Library Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Library"
                    value={formData.college.libraryName}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, libraryName: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="library@college.edu"
                    value={formData.college.email}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, email: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={formData.college.phone}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, phone: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">District & State</label>
                  <input
                    type="text"
                    placeholder="District, State"
                    value={formData.college.state}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, state: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.college.country}
                    onChange={e => setFormData({ ...formData, college: { ...formData.college, country: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Library Configuration */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-emerald-500" />
                <span>Library Rules & Policies</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure default circulation limits, overdue fines, and academic timings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="font-semibold text-blue-400 text-xs uppercase tracking-wider">Circulation Limits</div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Default Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.library.defaultIssueDurationDays}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        library: { ...formData.library, defaultIssueDurationDays: parseInt(e.target.value, 10) || 14 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Student Max Books</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.library.maxBooksStudent}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        library: { ...formData.library, maxBooksStudent: parseInt(e.target.value, 10) || 3 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Teacher Max Books</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.library.maxBooksTeacher}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        library: { ...formData.library, maxBooksTeacher: parseInt(e.target.value, 10) || 10 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="font-semibold text-emerald-400 text-xs uppercase tracking-wider">Overdue Fines</div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.library.currency}
                    onChange={e => setFormData({ ...formData, library: { ...formData.library, currency: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Daily Overdue Fine</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.library.dailyOverdueFine}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        library: { ...formData.library, dailyOverdueFine: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Max Fine Per Book</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.library.maxFinePerBook}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        library: { ...formData.library, maxFinePerBook: parseFloat(e.target.value) || 200 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="font-semibold text-purple-400 text-xs uppercase tracking-wider">Timings & Academic Year</div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={formData.library.academicYear}
                    onChange={e => setFormData({ ...formData, library: { ...formData.library, academicYear: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={formData.library.openingTime}
                    onChange={e => setFormData({ ...formData, library: { ...formData.library, openingTime: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={formData.library.closingTime}
                    onChange={e => setFormData({ ...formData, library: { ...formData.library, closingTime: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Librarian Account Creation */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-lg mx-auto w-full">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <UserCheck className="w-6 h-6 text-blue-500" />
                <span>Librarian Administrator Account</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">This account has full administrative authority over the library system.</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Librarian Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Robert Vance"
                  value={formData.librarian.fullName}
                  onChange={e =>
                    setFormData({ ...formData, librarian: { ...formData.librarian, fullName: e.target.value } })
                  }
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Administrator Username *</label>
                <input
                  type="text"
                  placeholder="e.g. librarian"
                  value={formData.librarian.username}
                  onChange={e =>
                    setFormData({ ...formData, librarian: { ...formData.librarian, username: e.target.value.toLowerCase() } })
                  }
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={formData.librarian.password}
                    onChange={e =>
                      setFormData({ ...formData, librarian: { ...formData.librarian, password: e.target.value } })
                    }
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                <div className="mt-2">
                  <div className="flex space-x-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4, 5].map(step => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full ${
                          pwdScore >= step
                            ? pwdScore <= 2
                              ? 'bg-red-500'
                              : pwdScore <= 4
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {pwdScore <= 2 ? 'Weak' : pwdScore <= 4 ? 'Moderate' : 'Strong Password'} (Upper, lower, digits, symbols)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Account Recovery Setup */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-xl mx-auto w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Secure Account Recovery Key</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                If you ever forget your librarian password, this cryptographically generated recovery key is the ONLY way to regain access without data loss.
              </p>
            </div>

            {/* Recovery Key Display */}
            <div className="p-4 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 max-w-md mx-auto">
              <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Emergency Recovery Key</div>
              <div className="font-mono text-lg font-bold text-amber-400 tracking-wider select-all py-2">
                {formData.recoveryKey || 'GENERATING-KEY...'}
              </div>
              <div className="flex items-center justify-center space-x-3 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(formData.recoveryKey);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 text-slate-200"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center space-x-1.5 text-slate-200"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-left text-xs text-amber-300">
              <div className="font-semibold mb-1">Important Security Policy:</div>
              The application never stores this plaintext key in the database (only an irreversible cryptographic hash). Keep a written copy in the college administrative safe.
            </div>

            <div className="flex items-center justify-center space-x-3 text-xs text-slate-300 text-left">
              <input
                type="checkbox"
                id="confirmRecovery"
                checked={recoveryConfirmed}
                onChange={e => setRecoveryConfirmed(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="confirmRecovery" className="cursor-pointer">
                I confirm that I have safely copied or printed my recovery key.
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: Application Appearance */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <Palette className="w-6 h-6 text-purple-500" />
                <span>Application Appearance</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Personalize the visual theme, accent colors, and table density.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Color Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map(theme => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setFormData({ ...formData, appearance: { ...formData.appearance, theme } })}
                        className={`py-3 px-4 rounded-xl border text-center capitalize font-semibold text-xs ${
                          formData.appearance.theme === theme
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Primary Accent Color</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {primaryColors.map(color => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, appearance: { ...formData.appearance, primaryColor: color.hex } })}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
                          formData.appearance.primaryColor === color.hex
                            ? 'border-white bg-slate-800 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color.hex }} />
                        <span>{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Table Density</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['compact', 'comfortable'] as const).map(density => (
                      <button
                        key={density}
                        type="button"
                        onClick={() => setFormData({ ...formData, appearance: { ...formData.appearance, tableDensity: density } })}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize ${
                          formData.appearance.tableDensity === density
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        {density}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live UI Preview</div>
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: formData.appearance.primaryColor }}
                    >
                      CL
                    </div>
                    <div>
                      <div className="text-xs font-bold">{formData.college.libraryName || 'College Library'}</div>
                      <div className="text-[10px] text-slate-400">Library Management System</div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 w-3/4" />
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ backgroundColor: formData.appearance.primaryColor }}
                    >
                      Sample Button
                    </button>
                    <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300">
                      Secondary
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-4">
                  Theme applies immediately across the entire dashboard upon setup completion.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Backup Configuration */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <HardDrive className="w-6 h-6 text-blue-500" />
                <span>Automated Database Backup</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure scheduled encrypted backups to safeguard institutional library records.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">Enable Automated Backup</div>
                    <div className="text-xs text-slate-400">Backs up full encrypted SQLite database periodically</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.backup.autoBackupEnabled}
                    onChange={e => setFormData({ ...formData, backup: { ...formData.backup, autoBackupEnabled: e.target.checked } })}
                    className="w-5 h-5 rounded border-slate-700 text-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Backup Frequency</label>
                  <select
                    value={formData.backup.frequency}
                    onChange={e => setFormData({ ...formData, backup: { ...formData.backup, frequency: e.target.value as any } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="daily">Daily (Recommended)</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Scheduled Backup Time</label>
                  <input
                    type="time"
                    value={formData.backup.backupTime}
                    onChange={e => setFormData({ ...formData, backup: { ...formData.backup, backupTime: e.target.value } })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Retention Copies</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={formData.backup.backupRetentionCount}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        backup: { ...formData.backup, backupRetentionCount: parseInt(e.target.value, 10) || 14 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                  <span className="text-[11px] text-slate-400">Keeps the newest 14 backups and auto-prunes older ones.</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="font-semibold text-xs text-blue-400 uppercase tracking-wider">Default Backup Destination</div>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 break-all border border-slate-800">
                  %APPDATA%/CollegeLibraryManager/Backups/
                </div>
                <p className="text-xs text-slate-400">
                  You can also plug in an external USB flash drive or external hard drive anytime from the Backup & Restore screen to create offline physical copies.
                </p>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  An initial encrypted backup snapshot will automatically be generated immediately upon finishing this wizard.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: Setup Completion */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-xl mx-auto w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white">System Ready for Launch!</h2>
              <p className="text-xs text-slate-400 mt-1">Review your initial college configuration below.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">College Name:</span>
                <span className="font-semibold text-white">{formData.college.name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Library:</span>
                <span className="font-semibold text-white">{formData.college.libraryName}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Librarian Admin:</span>
                <span className="font-semibold text-white">{formData.librarian.username} ({formData.librarian.fullName})</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Academic Year:</span>
                <span className="font-semibold text-white">{formData.library.academicYear}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Issue Duration:</span>
                <span className="font-semibold text-white">{formData.library.defaultIssueDurationDays} Days</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Backup Configuration:</span>
                <span className="font-semibold text-emerald-400">Automated Daily Enabled</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              On subsequent launches, the application will take you straight to the Librarian Login screen.
            </p>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
          {currentStep > 1 && currentStep < 8 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold flex items-center space-x-1.5 border border-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center space-x-1.5 shadow-lg shadow-blue-600/25 transition ml-auto"
            >
              <span>{currentStep === 1 ? 'Get Started' : 'Continue'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinalSubmit}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/25 transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loading ? 'Initializing Database & Saving...' : 'Open Library Dashboard'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-500">
        College Library Manager &bull; Windows Desktop Edition &bull; High Reliability Offline Architecture
      </div>
    </div>
  );
};
