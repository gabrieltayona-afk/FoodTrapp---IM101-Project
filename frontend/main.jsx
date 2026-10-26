import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Package, ShoppingCart, LogOut, Leaf,
  RefreshCw, UserPlus, LogIn, Store, Truck, MapPin,
  Phone, Hash, ClipboardList, Plus, X, Minus, CreditCard,
  ChevronRight, ArrowLeft, ShoppingBag, CheckCircle, AlertCircle,
  Eye, PackageCheck, User, KeyRound, Mail, ShieldCheck, Check,
  Building, FileText, Sparkles, Send, ArrowRight, Printer, Clock, FileCheck, AlertTriangle
} from 'lucide-react';
import './style.css';

/* ─────────────────────── constants ────────────────────────────────── */
const APP_NAME = 'Food Supply Network';
const TOKEN_KEY = 'fsn_token';

/* ─────────────────────── helpers ──────────────────────────────────── */
async function request(path, token, options = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Unable to connect to backend server. Please verify it is running on port 3001.');
  }

  let data = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: `Server returned non-JSON response (${res.status}): ${text.slice(0, 100)}` };
    }
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed with status ${res.status}`);
    err.fieldErrors = data.fieldErrors || null;
    err.status = res.status;
    throw err;
  }
  return data;
}

function fmt(n) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

/* ─────────────────────── badge maps ───────────────────────────────── */
function StatusBadge({ value, map }) {
  const cfg = map[value] || { cls: 'badge-neutral', label: value };
  return <span className={`badge ${cfg.cls}`}>{cfg.label ?? value}</span>;
}

const ORDER_STATUS_MAP = {
  Pending:   { cls: 'badge-pending',   label: 'Pending'   },
  Confirmed: { cls: 'badge-confirmed', label: 'Confirmed' },
  Shipped:   { cls: 'badge-shipped',   label: 'Shipped'   },
  Delivered: { cls: 'badge-active',    label: 'Delivered' },
  Cancelled: { cls: 'badge-inactive',  label: 'Cancelled' },
};
const DELIVERY_STATUS_MAP = {
  Scheduled:  { cls: 'badge-pending',   label: 'Scheduled'          },
  InTransit:  { cls: 'badge-shipped',   label: 'In Transit'         },
  Delivered:  { cls: 'badge-active',    label: 'Delivered'          },
  Failed:     { cls: 'badge-inactive',  label: 'Failed'             },
  Rescheduled:{ cls: 'badge-confirmed', label: 'Rescheduled'        },
};
const PAYMENT_STATUS_MAP = {
  Unpaid:   { cls: 'badge-pending',   label: 'Unpaid'   },
  Paid:     { cls: 'badge-active',    label: 'Paid'     },
  Overdue:  { cls: 'badge-inactive',  label: 'Overdue'  },
  Refunded: { cls: 'badge-confirmed', label: 'Refunded' },
};

/* ─────────────────────── Modal wrapper ────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div className="modal-overlay">
      <div className={`modal-box${wide ? ' modal-wide' : ''}`} ref={ref}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════ AUTH PAGE ═══════════════════════════════════════ */
function AuthPage({ onToken, initialError = '' }) {
  // modes: 'login' | 'signup' | 'verify' | 'verify_success' | 'forgot' | 'reset' | 'reset_success'
  const [mode,             setMode]             = useState('login');
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [confirm,          setConfirm]          = useState('');
  const [name,             setName]             = useState('');
  const [role,             setRole]             = useState('');
  const [contactNo,        setContactNo]        = useState('');
  const [bizName,          setBizName]          = useState('');
  const [stallNum,         setStallNum]         = useState('');
  const [address,          setAddress]          = useState('');
  const [error,            setError]            = useState(initialError);
  const [info,             setInfo]             = useState('');
  const [busy,             setBusy]             = useState(false);
  const [fieldErrors,      setFieldErrors]      = useState({});

  // Verification state
  const [verifyEmail,      setVerifyEmail]      = useState('');
  const [verifyCode,       setVerifyCode]       = useState('');

  // Password reset state
  const [resetToken,       setResetToken]       = useState('');
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmNewPass,   setConfirmNewPass]   = useState('');

  // Check URL query parameters for password reset link (?reset_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('reset_token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setMode('reset');
    }
  }, []);

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirm(''); setName(''); setRole('');
    setContactNo(''); setBizName(''); setStallNum(''); setAddress('');
    setError(''); setInfo(''); setVerifyCode(''); setFieldErrors({});
    setNewPassword(''); setConfirmNewPass('');
  };

  const switchMode = (next) => { resetForm(); setMode(next); };

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim());
  const cleanPhoneDigits = contactNo.replace(/\D/g, '');
  const isValidContact = cleanPhoneDigits.length >= 7 && cleanPhoneDigits.length <= 15 && /^[0-9+\-\s()]+$/.test(contactNo.trim());

  // Password Strength Criteria Evaluation
  const passLength  = password.length >= 8;
  const passUpper   = /[A-Z]/.test(password);
  const passLower   = /[a-z]/.test(password);
  const passNumber  = /[0-9]/.test(password);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isStrongPassword = passLength && passUpper && passLower && passNumber && passSpecial;
  const passMatch   = confirm.length > 0 && password === confirm;

  // Validation flag for signup button
  const isSignupValid =
    Boolean(role) &&
    name.trim().length >= 2 &&
    bizName.trim().length >= 2 &&
    isValidEmail(email) &&
    isValidContact &&
    isStrongPassword &&
    passMatch;

  const handleLogin = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setInfo(''); setFieldErrors({});
    try {
      const d = await request('/login', '', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      sessionStorage.setItem(TOKEN_KEY, d.token);
      onToken(d.token);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('not been verified yet')) {
        setVerifyEmail(email.trim().toLowerCase());
        setInfo('Your email is awaiting verification. Click below to enter your 6-digit code.');
      }
    } finally { setBusy(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setInfo(''); setFieldErrors({});

    const errors = {};
    if (!role) errors.role = 'Please select your account type.';
    if (name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.';
    if (!bizName.trim()) errors.bizName = (role === 'BusinessOwner' ? 'Business name' : 'Shop / supplier name') + ' is required.';
    if (!contactNo.trim()) {
      errors.contactNo = 'Contact number is required.';
    } else if (!isValidContact) {
      errors.contactNo = 'Enter a valid phone number (7-15 digits, e.g. 0917-123-4567 or +639171234567).';
    }
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address (e.g. name@example.com).';
    }
    if (!isStrongPassword) {
      errors.password = 'Password must meet all 5 requirements below.';
    }
    if (password !== confirm) {
      errors.confirm = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please resolve the highlighted field errors before submitting.');
      setBusy(false);
      return;
    }

    try {
      const resp = await request('/register', '', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          contactNo: contactNo.trim(),
          businessName: bizName.trim(),
          stallNumber: stallNum.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });

      setVerifyEmail(email.trim().toLowerCase());
      setMode('verify');
      setInfo(resp.message || 'Verification code sent to your email.');
    } catch (err) {
      setError(err.message);
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally { setBusy(false); }
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault(); setBusy(true); setError(''); setInfo('');
    if (!verifyCode || verifyCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      setBusy(false); return;
    }

    try {
      await request('/verify-code', '', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail, code: verifyCode.trim() }),
      });
      // Move to explicit confirmation screen
      setMode('verify_success');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleResendCode = async () => {
    if (!verifyEmail) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const resp = await request('/resend-code', '', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail }),
      });
      setInfo(resp.message || 'A new verification code has been dispatched to your email.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setInfo('');
    if (!isValidEmail(email)) {
      setError('Please provide a valid registered email address.');
      setBusy(false); return;
    }

    try {
      const resp = await request('/forgot-password', '', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setInfo(resp.message || 'Password reset instructions sent to your email address.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setInfo('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      setBusy(false); return;
    }
    if (newPassword !== confirmNewPass) {
      setError('Passwords do not match.');
      setBusy(false); return;
    }

    try {
      await request('/reset-password', '', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      // Move to explicit reset success screen
      setMode('reset_success');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand"><Leaf size={24} /> {APP_NAME}</div>

        {/* ── 1. LOGIN SCREEN ── */}
        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            <h1>Welcome back</h1>
            <p className="login-subtitle">Sign in to your workspace.</p>

            {error && <div className="error">{error}</div>}
            {info  && <div className="info">{info}</div>}

            <label className="input-group">Email address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
              />
            </label>

            <div className="input-group">
              <div className="label-with-link">
                <label>Password</label>
                <button
                  type="button"
                  className="link-btn link-forgot"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button disabled={busy} className="submit-btn">
              {busy ? 'Signing in…' : <><LogIn size={16} /> Sign in</>}
            </button>

            {verifyEmail && (
              <div className="verify-quick-action">
                <p>Have a verification code for <strong>{verifyEmail}</strong>?</p>
                <button type="button" className="btn-secondary-sm" onClick={() => setMode('verify')}>
                  <ShieldCheck size={14} /> Enter Verification Code
                </button>
              </div>
            )}

            <div className="auth-switch">
              No account? <button type="button" className="link-btn" onClick={() => switchMode('signup')}>Sign up</button>
            </div>
          </form>
        )}

        {/* ── 2. SIGNUP SCREEN ── */}
        {mode === 'signup' && (
          <form className="login-form" onSubmit={handleSignup}>
            <h1>Create account</h1>
            <p className="login-subtitle">Join the Bohol food supply network.</p>

            <p className="role-label">I am registering as a… <span className="req">*</span></p>
            <div className="role-cards">
              <button
                type="button"
                className={`role-card ${role === 'BusinessOwner' ? 'selected' : ''}`}
                onClick={() => { setRole('BusinessOwner'); setFieldErrors(prev => ({ ...prev, role: null })); }}
              >
                <Store size={26} />
                <strong>Business Owner</strong>
                <small>Browse network, manage purchases &amp; orders</small>
              </button>
              <button
                type="button"
                className={`role-card ${role === 'Supplier' ? 'selected' : ''}`}
                onClick={() => { setRole('Supplier'); setFieldErrors(prev => ({ ...prev, role: null })); }}
              >
                <Truck size={26} />
                <strong>Food Supplier</strong>
                <small>List food catalog, manage stock &amp; fulfil orders</small>
              </button>
            </div>
            {fieldErrors.role && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.role}</div>}

            <label className="input-group">Contact Person Full Name <span className="req">*</span>
              <input
                type="text"
                value={name}
                className={fieldErrors.name ? 'input-invalid' : ''}
                onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null })); }}
                placeholder="e.g. Jane Santos"
                required
              />
              {fieldErrors.name && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.name}</div>}
            </label>

            {role === 'BusinessOwner' && (
              <>
                <label className="input-group">Business Name <span className="req">*</span>
                  <input
                    type="text"
                    value={bizName}
                    className={fieldErrors.bizName ? 'input-invalid' : ''}
                    onChange={e => { setBizName(e.target.value); if (fieldErrors.bizName) setFieldErrors(prev => ({ ...prev, bizName: null })); }}
                    placeholder="e.g. Kusina ni Maria"
                    required
                  />
                  {fieldErrors.bizName && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.bizName}</div>}
                </label>
                <label className="input-group">Stall / Unit Number (optional)
                  <input
                    type="text"
                    value={stallNum}
                    onChange={e => setStallNum(e.target.value)}
                    placeholder="e.g. Stall A-12, Bohol Market"
                  />
                </label>
              </>
            )}

            {role === 'Supplier' && (
              <label className="input-group">Shop / Supplier Name <span className="req">*</span>
                <input
                  type="text"
                  value={bizName}
                  className={fieldErrors.bizName ? 'input-invalid' : ''}
                  onChange={e => { setBizName(e.target.value); if (fieldErrors.bizName) setFieldErrors(prev => ({ ...prev, bizName: null })); }}
                  placeholder="e.g. Tagbilaran Fresh Meats"
                  required
                />
                {fieldErrors.bizName && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.bizName}</div>}
              </label>
            )}

            {/* MANDATORY CONTACT NUMBER */}
            <label className="input-group">Contact Number <span className="req">*</span>
              <input
                type="tel"
                value={contactNo}
                className={fieldErrors.contactNo ? 'input-invalid' : ''}
                onChange={e => { setContactNo(e.target.value); if (fieldErrors.contactNo) setFieldErrors(prev => ({ ...prev, contactNo: null })); }}
                placeholder="09XX-XXX-XXXX or +639XXXXXXXXX (min 7 digits)"
                required
              />
              {fieldErrors.contactNo ? (
                <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.contactNo}</div>
              ) : (
                <span className="field-hint">Required for order notifications and dispatch coordination.</span>
              )}
            </label>

            {/* MANDATORY EMAIL ADDRESS */}
            <label className="input-group">Email Address <span className="req">*</span>
              <input
                type="email"
                value={email}
                className={fieldErrors.email ? 'input-invalid' : ''}
                onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: null })); }}
                placeholder="name@example.com"
                required
              />
              {fieldErrors.email ? (
                <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.email}</div>
              ) : (
                <span className="field-hint">Required. A 6-digit verification code will be sent to this email.</span>
              )}
            </label>

            {role && (
              <label className="input-group">Business Address &amp; Location (optional)
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street, Barangay, City, Bohol"
                />
              </label>
            )}

            <div className="input-group">
              <label>Password <span className="req">*</span></label>
              <input
                type="password"
                value={password}
                className={fieldErrors.password ? 'input-invalid' : ''}
                onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: null })); }}
                placeholder="Create strong password"
                required
              />
              {/* Dynamic Password Strength Checklist */}
              <div className="password-checklist">
                <div className="checklist-title">Password Security Requirements:</div>
                <div className={`checklist-item ${passLength ? 'valid' : 'invalid'}`}>
                  <span className="checklist-icon">{passLength ? <Check size={13} /> : '•'}</span>
                  <span>At least 8 characters long</span>
                </div>
                <div className={`checklist-item ${passUpper ? 'valid' : 'invalid'}`}>
                  <span className="checklist-icon">{passUpper ? <Check size={13} /> : '•'}</span>
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`checklist-item ${passLower ? 'valid' : 'invalid'}`}>
                  <span className="checklist-icon">{passLower ? <Check size={13} /> : '•'}</span>
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`checklist-item ${passNumber ? 'valid' : 'invalid'}`}>
                  <span className="checklist-icon">{passNumber ? <Check size={13} /> : '•'}</span>
                  <span>At least one number (0-9)</span>
                </div>
                <div className={`checklist-item ${passSpecial ? 'valid' : 'invalid'}`}>
                  <span className="checklist-icon">{passSpecial ? <Check size={13} /> : '•'}</span>
                  <span>At least one special symbol (!@#$%^&*...)</span>
                </div>
              </div>
              {fieldErrors.password && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.password}</div>}
            </div>

            <div className="input-group">
              <label>Confirm Password <span className="req">*</span></label>
              <input
                type="password"
                value={confirm}
                className={fieldErrors.confirm ? 'input-invalid' : ''}
                onChange={e => { setConfirm(e.target.value); if (fieldErrors.confirm) setFieldErrors(prev => ({ ...prev, confirm: null })); }}
                placeholder="Re-enter password"
                required
              />
              {confirm && (
                <div className={`password-match-tag ${passMatch ? 'matched' : 'mismatched'}`}>
                  {passMatch ? <><Check size={13} /> Passwords match</> : <><X size={13} /> Passwords do not match</>}
                </div>
              )}
              {fieldErrors.confirm && <div className="field-error-msg"><AlertCircle size={13} /> {fieldErrors.confirm}</div>}
            </div>

            {error && <div className="error"><AlertCircle size={16} /> {error}</div>}
            {info  && <div className="info">{info}</div>}

            {!isSignupValid && (
              <div className="validation-warning">
                Please complete all required fields marked with <span className="req">*</span> and ensure password requirements are satisfied to enable registration.
              </div>
            )}

            <button disabled={busy || !isSignupValid} className="submit-btn">
              {busy ? <><RefreshCw size={16} className="spinning" /> Creating account…</> : <><UserPlus size={16} /> Continue to Email Verification</>}
            </button>

            <div className="auth-switch">
              Have an account? <button type="button" className="link-btn" onClick={() => switchMode('login')}>Sign in</button>
            </div>
          </form>
        )}

        {/* ── 3. EMAIL VERIFICATION SCREEN ── */}
        {mode === 'verify' && (
          <div className="verification-screen">
            <div className="screen-icon-badge">
              <Mail size={32} />
            </div>
            <h1>Email Verification</h1>
            <p className="screen-subtitle">
              We sent a 6-digit verification code to<br />
              <strong>{verifyEmail}</strong>
            </p>

            {error && <div className="error">{error}</div>}
            {info  && <div className="info">{info}</div>}

            <form onSubmit={handleVerifyCode} className="verify-form">
              <label className="input-group" style={{ textAlign: 'center' }}>
                Enter 6-Digit Numeric Code
                <input
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="code-input"
                  autoFocus
                  required
                />
              </label>

              <button
                type="submit"
                className="submit-btn"
                disabled={busy || verifyCode.trim().length !== 6}
              >
                {busy ? 'Verifying code…' : <><ShieldCheck size={16} /> Verify &amp; Activate Account</>}
              </button>
            </form>

            <div className="resend-row">
              Didn't receive the email?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={handleResendCode}
                disabled={busy}
              >
                Resend code
              </button>
            </div>

            <div className="auth-switch" style={{ marginTop: 14 }}>
              <button type="button" className="link-btn" onClick={() => switchMode('signup')}>
                &larr; Back to Sign Up / Change Email
              </button>
            </div>
          </div>
        )}

        {/* ── 4. ACCOUNT CREATION CONFIRMATION UX ── */}
        {mode === 'verify_success' && (
          <div className="confirmation-screen">
            <div className="success-icon-badge">
              <CheckCircle size={44} />
            </div>
            <h1>Account Successfully Created!</h1>
            <p className="screen-subtitle">
              Your email has been verified and your account is now activated. You can now log in to manage your inventory and orders.
            </p>

            <div className="confirmed-email-card">
              <ShieldCheck size={18} color="#16774d" />
              <span>Verified Account: <strong>{verifyEmail}</strong></span>
            </div>

            <button
              type="button"
              className="submit-btn"
              style={{ marginTop: 24 }}
              onClick={() => {
                setEmail(verifyEmail);
                switchMode('login');
              }}
            >
              <LogIn size={16} /> Proceed to Login
            </button>
          </div>
        )}

        {/* ── 5. FORGOT PASSWORD FLOW ── */}
        {mode === 'forgot' && (
          <form className="login-form" onSubmit={handleForgotPassword}>
            <div className="screen-icon-badge">
              <KeyRound size={30} />
            </div>
            <h1>Forgot Password</h1>
            <p className="login-subtitle">
              Enter your registered email address to receive a secure, time-limited password reset link.
            </p>

            {error && <div className="error">{error}</div>}
            {info  && <div className="info">{info}</div>}

            <label className="input-group">Registered Email Address
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
              />
            </label>

            <button disabled={busy || !isValidEmail(email)} className="submit-btn">
              {busy ? 'Sending link…' : <><Send size={15} /> Send Password Reset Link</>}
            </button>

            <div className="auth-switch">
              Remember your password? <button type="button" className="link-btn" onClick={() => switchMode('login')}>Sign in</button>
            </div>
          </form>
        )}

        {/* ── 6. RESET PASSWORD SCREEN ── */}
        {mode === 'reset' && (
          <form className="login-form" onSubmit={handleResetPassword}>
            <div className="screen-icon-badge">
              <KeyRound size={30} />
            </div>
            <h1>Define New Password</h1>
            <p className="login-subtitle">
              Please enter your new secure password.
            </p>

            {error && <div className="error">{error}</div>}
            {info  && <div className="info">{info}</div>}

            <label className="input-group">New Password
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
            </label>

            <label className="input-group">Confirm New Password
              <input
                type="password"
                value={confirmNewPass}
                onChange={e => setConfirmNewPass(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </label>

            <button
              disabled={busy || newPassword.length < 8 || newPassword !== confirmNewPass}
              className="submit-btn"
            >
              {busy ? 'Updating password…' : <><Check size={16} /> Update Password &amp; Log In</>}
            </button>

            <div className="auth-switch">
              <button type="button" className="link-btn" onClick={() => switchMode('login')}>
                &larr; Cancel and return to Login
              </button>
            </div>
          </form>
        )}

        {/* ── 7. RESET PASSWORD SUCCESS SCREEN ── */}
        {mode === 'reset_success' && (
          <div className="confirmation-screen">
            <div className="success-icon-badge">
              <CheckCircle size={44} />
            </div>
            <h1>Password Successfully Reset!</h1>
            <p className="screen-subtitle">
              Your account password has been updated. You can now log in using your new credentials.
            </p>

            <button
              type="button"
              className="submit-btn"
              style={{ marginTop: 24 }}
              onClick={() => switchMode('login')}
            >
              <LogIn size={16} /> Proceed to Login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

/* ══════════════════ SHELL WRAPPER ═══════════════════════════════════ */
function Shell({ me, onLogout, onRefresh, busy, tabs, activeTab, setTab, children }) {
  const currentTab = tabs.find(([id]) => id === activeTab);
  const tabTitle = currentTab?.[2] || '';

  return (
    <div className="shell">
      <aside>
        <div className="brand"><Leaf size={22} /> Food Supply</div>
        <nav>
          {tabs.map(([id, Icon, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-user-name">{me?.ShopName || me?.Name || 'Loading…'}</span>
          <small className="sidebar-user-role">
            {me?.Role === 'BusinessOwner' ? 'Business Owner' : me?.Role || ''}
            {me?.ShopName && me?.Name ? ` · ${me.Name}` : ''}
          </small>
          <button onClick={onLogout}><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      <main className="content">
        <header>
          <div>
            <span className="eyebrow">{APP_NAME.toUpperCase()}</span>
            <h1>{tabTitle}</h1>
            <p>
              {me?.Role === 'Supplier' && activeTab === 'products' ? (
                <>Managing store inventory for <strong>{me.ShopName || me.SupplierName}</strong></>
              ) : me ? (
                `${me.Name} · ${me.ShopName ? me.ShopName + ' · ' : ''}${me.Role === 'BusinessOwner' ? 'Business Owner' : me.Role}`
              ) : (
                'Loading…'
              )}
            </p>
          </div>
          <button className="refresh" onClick={onRefresh} disabled={busy}>
            <RefreshCw size={16} className={busy ? 'spinning' : ''} /> Refresh
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}

/* ══════════════════ DEDICATED PROFILE TAB ═══════════════════════════ */
function ProfileTab({ me, token, onUpdateMe }) {
  const [formData, setFormData] = useState({
    name: me?.Name || '',
    shopName: me?.ShopName || me?.SupplierName || me?.BusinessName || '',
    contactNo: me?.ContactNo || '',
    address: me?.Address || '',
    stallNumber: me?.StallNumber || '',
    description: me?.Description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state when me updates
  useEffect(() => {
    if (me) {
      setFormData({
        name: me.Name || '',
        shopName: me.ShopName || me.SupplierName || me.BusinessName || '',
        contactNo: me.ContactNo || '',
        address: me.Address || '',
        stallNumber: me.StallNumber || '',
        description: me.Description || '',
      });
    }
  }, [me]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    if (!formData.contactNo.trim() || formData.contactNo.trim().length < 7) {
      setError('A valid contact number is required (min 7 digits).');
      setSaving(false);
      return;
    }

    try {
      const result = await request('/profile', token, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (result.user && onUpdateMe) {
        onUpdateMe(result.user);
      }
      setSuccessMsg(result.message || 'Profile saved! Network directory synchronized in real time.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isSupplier = me?.Role === 'Supplier';
  const isBusinessOwner = me?.Role === 'BusinessOwner';

  return (
    <div className="profile-container">
      <section className="profile-hero">
        <div className="profile-hero-avatar">
          {isSupplier ? <Truck size={36} /> : isBusinessOwner ? <Store size={36} /> : <User size={36} />}
        </div>
        <div className="profile-hero-info">
          <h2>{formData.shopName || me?.Name}</h2>
          <p className="profile-hero-sub">
            <span className="role-tag-badge">
              {isSupplier ? 'Official Supplier Shop' : isBusinessOwner ? 'Business Owner' : 'System Administrator'}
            </span>
            <span className="profile-meta-email">{me?.Email}</span>
          </p>
        </div>
      </section>

      {successMsg && (
        <div className="info profile-sync-alert">
          <CheckCircle size={20} />
          <div>
            <strong>Network Synchronized</strong>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <section className="profile-card-form">
        <form onSubmit={handleSubmit}>
          <div className="profile-fields-grid">
            {/* Column 1: Store & Account Identity */}
            <div className="form-column">
              <h3 className="section-sub-heading">
                <Building size={16} /> {isSupplier ? 'Supplier Shop Identity' : isBusinessOwner ? 'Business Identity' : 'Account Details'}
              </h3>

              {(isSupplier || isBusinessOwner) && (
                <label className="form-label">
                  {isSupplier ? 'Official Supplier Shop Name' : 'Business Name'} <span className="req">*</span>
                  <input
                    type="text"
                    value={formData.shopName}
                    onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder={isSupplier ? 'e.g. Tagbilaran Fresh Meats' : 'e.g. Kusina ni Maria'}
                    required
                  />
                  <span className="field-hint">
                    {isSupplier
                      ? "Prominently displayed in 'My Products' and public 'Shops on the Network'."
                      : "Identifies your store to suppliers and on delivery waybills."}
                  </span>
                </label>
              )}

              <label className="form-label">
                Contact Person Full Name <span className="req">*</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full Name"
                  required
                />
              </label>

              <label className="form-label">
                Account Email Address (Login ID)
                <input
                  type="email"
                  value={me?.Email || ''}
                  disabled
                  className="input-disabled"
                />
                <span className="field-hint">Registered primary email for system access.</span>
              </label>

              {isBusinessOwner && (
                <label className="form-label">
                  Stall / Unit Number
                  <input
                    type="text"
                    value={formData.stallNumber}
                    onChange={e => setFormData({ ...formData, stallNumber: e.target.value })}
                    placeholder="e.g. Stall A-14, Bohol Market"
                  />
                </label>
              )}
            </div>

            {/* Column 2: Contact, Location & Description */}
            <div className="form-column">
              <h3 className="section-sub-heading">
                <MapPin size={16} /> Contact &amp; Public Network Details
              </h3>

              <label className="form-label">
                Contact Number <span className="req">*</span>
                <input
                  type="tel"
                  value={formData.contactNo}
                  onChange={e => setFormData({ ...formData, contactNo: e.target.value })}
                  placeholder="e.g. 0928-222-0001"
                  required
                />
                <span className="field-hint">Official contact line for purchase inquiries and dispatch logistics.</span>
              </label>

              <label className="form-label">
                Store / Business Address &amp; Location
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Barangay, Municipality/City, Province"
                />
                <span className="field-hint">Physical warehouse location or delivery drop-off point.</span>
              </label>

              {(isSupplier || isBusinessOwner) && (
                <label className="form-label">
                  Shop Description
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={isSupplier
                      ? "Describe your food supply offerings, specialty cuts, fresh harvests, or delivery areas..."
                      : "Brief description of your business..."
                    }
                  />
                  <span className="field-hint">
                    {isSupplier
                      ? "Real-time sync: Instantly visible to Business Owners browsing 'Shops on the Network'."
                      : "Internal store description and notes."}
                  </span>
                </label>
              )}
            </div>
          </div>

          <div className="profile-form-footer">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <><RefreshCw size={16} className="spinning" /> Saving Changes…</>
              ) : (
                <><Check size={16} /> Save Profile Changes</>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ══════════════════ VERIFIED BUSINESS BADGE ═════════════════════════ */
function VerifiedBadge({ size = 13, text = 'Verified Business', large = false }) {
  return (
    <span className={`badge-verified${large ? ' badge-lg' : ''}`} title="Verified Legitimate Business on Food Supply Network">
      <ShieldCheck size={size} />
      <span>{text}</span>
    </span>
  );
}

/* ══════════════════ VERIFICATION BANNER ═════════════════════════════ */
function VerificationBanner({ me, onNavigateToVerification }) {
  if (!me || me.Role === 'Admin') return null;
  const status = me.VerificationStatus || 'Pending Verification';

  if (status === 'Verified') {
    return (
      <div className="verification-banner verified">
        <div className="banner-left">
          <ShieldCheck size={22} className="banner-icon" />
          <div>
            <div className="banner-title">Verified Legitimate Business</div>
            <div className="banner-desc">Your business credentials and registration documents have been officially verified by platform administrators.</div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'Pending Verification') {
    return (
      <div className="verification-banner pending">
        <div className="banner-left">
          <Clock size={22} className="banner-icon" />
          <div>
            <div className="banner-title">Business Verification Pending</div>
            <div className="banner-desc">Your business registration documents are currently under review. Sensitive actions (such as placing orders or publishing products) will be unlocked once approved.</div>
          </div>
        </div>
        <button type="button" className="banner-btn" onClick={onNavigateToVerification}>
          <ShieldCheck size={14} /> View Status
        </button>
      </div>
    );
  }

  if (status === 'Requires Additional Information') {
    return (
      <div className="verification-banner requires-info">
        <div className="banner-left">
          <AlertCircle size={22} className="banner-icon" />
          <div>
            <div className="banner-title">Additional Business Information Requested</div>
            <div className="banner-desc">The administrator requested additional documents or clarification to verify your business legitimacy.</div>
            {me.VerificationAdminNotes && (
              <div className="banner-reason-box">Note from Admin: "{me.VerificationAdminNotes}"</div>
            )}
          </div>
        </div>
        <button type="button" className="banner-btn" onClick={onNavigateToVerification}>
          <ShieldCheck size={14} /> Update &amp; Resubmit
        </button>
      </div>
    );
  }

  if (status === 'Rejected') {
    return (
      <div className="verification-banner rejected">
        <div className="banner-left">
          <AlertCircle size={22} className="banner-icon" />
          <div>
            <div className="banner-title">Business Verification Not Approved</div>
            <div className="banner-desc">Your business verification application was not approved. Please review the feedback and submit updated documents.</div>
            {me.VerificationAdminNotes && (
              <div className="banner-reason-box">Reason: "{me.VerificationAdminNotes}"</div>
            )}
          </div>
        </div>
        <button type="button" className="banner-btn" onClick={onNavigateToVerification}>
          <RefreshCw size={14} /> Resubmit Documents
        </button>
      </div>
    );
  }

  return null;
}

/* ══════════════════ PRINTABLE ORDER RECEIPT MODAL ════════════════════ */
function ReceiptModal({ orderId, token, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function fetchReceipt() {
      setLoading(true); setError('');
      try {
        const data = await request(`/orders/${orderId}/receipt`, token);
        if (active) setReceipt(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchReceipt();
    return () => { active = false; };
  }, [orderId, token]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-wide">
        <div className="receipt-actions-bar no-print">
          <button type="button" className="btn-primary" onClick={handlePrint} disabled={!receipt}>
            <Printer size={15} /> Print / Save as PDF
          </button>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} /> Close
          </button>
        </div>

        {loading && (
          <div className="loading-spinner" style={{ padding: '40px 0' }}>
            <RefreshCw size={28} className="spinning" />
            <p>Loading order receipt…</p>
          </div>
        )}
        {error && <div className="error"><AlertCircle size={16} /> {error}</div>}

        {receipt && (
          <div className="receipt-wrapper" id="printable-receipt">
            {/* Header */}
            <div className="receipt-header">
              <div>
                <div className="receipt-brand-name">
                  <Leaf size={24} /> {APP_NAME}
                </div>
                <div className="receipt-brand-sub">Bohol Marketplace Logistics · Multi-Tenant Supply Platform</div>
                <div style={{ marginTop: 6, fontSize: 11.5, color: '#718078' }}>
                  Tagbilaran City, Bohol, Philippines · support@foodnet.test
                </div>
              </div>
              <div>
                <div className="receipt-type-badge">{receipt.receiptType}</div>
                <div className="receipt-meta-box">
                  <div>Receipt No: <strong>{receipt.receiptNumber}</strong></div>
                  <div>Order Reference: <strong>#{receipt.orderId}</strong></div>
                  <div>Date: <strong>{new Date(receipt.receiptDate).toLocaleString('en-PH')}</strong></div>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="receipt-parties-grid">
              <div className="receipt-party-col">
                <h4>SUPPLIER (SELLER)</h4>
                <div className="receipt-party-name">
                  {receipt.supplier.name}
                  {receipt.supplier.isVerified && <VerifiedBadge size={12} />}
                </div>
                <div className="receipt-party-detail">
                  <div>{receipt.supplier.address}</div>
                  <div>Phone: {receipt.supplier.contact}</div>
                  {receipt.supplier.description && (
                    <div style={{ marginTop: 4, fontStyle: 'italic', color: '#718078' }}>
                      {receipt.supplier.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="receipt-party-col">
                <h4>CUSTOMER (BUYING BUSINESS)</h4>
                <div className="receipt-party-name">
                  {receipt.customer.businessName}
                  {receipt.customer.isVerified && <VerifiedBadge size={12} />}
                </div>
                <div className="receipt-party-detail">
                  {receipt.customer.stallNumber && <div>Stall / Unit: {receipt.customer.stallNumber}</div>}
                  <div>{receipt.customer.address}</div>
                  <div>Contact: {receipt.customer.contactPerson} ({receipt.customer.contact})</div>
                  <div>Email: {receipt.customer.email}</div>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="receipt-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Product Description</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>
                      <td><strong>{item.name}</strong></td>
                      <td><span className="category-tag">{item.category}</span></td>
                      <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{fmt(item.lineTotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="receipt-summary-block">
              <div className="receipt-totals-table">
                <div className="receipt-total-row">
                  <span>Subtotal</span>
                  <strong>{fmt(receipt.subtotal)}</strong>
                </div>
                <div className="receipt-total-row">
                  <span>Delivery Fee</span>
                  <span>{receipt.deliveryFee > 0 ? fmt(receipt.deliveryFee) : 'FREE (Local Bohol)'}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="receipt-total-row" style={{ color: '#16774d' }}>
                    <span>Discount</span>
                    <span>-{fmt(receipt.discount)}</span>
                  </div>
                )}
                <div className="receipt-total-row receipt-grand-total">
                  <span>Total Amount</span>
                  <span>{fmt(receipt.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment & Logistics Status */}
            <div className="receipt-status-banner">
              <div className="receipt-status-item">
                <label>Payment Method &amp; Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <StatusBadge value={receipt.paymentStatus} map={PAYMENT_STATUS_MAP} />
                  <strong>{receipt.paymentMethod}</strong>
                </div>
                {receipt.paymentReference && (
                  <div style={{ fontSize: 11.5, color: '#5a6e64', marginTop: 4 }}>
                    Transaction Ref: <code>{receipt.paymentReference}</code>
                  </div>
                )}
              </div>

              <div className="receipt-status-item">
                <label>Order &amp; Shipment Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <StatusBadge value={receipt.orderStatus} map={ORDER_STATUS_MAP} />
                  <span>Delivery: <strong>{receipt.delivery.status}</strong></span>
                </div>
                {receipt.delivery.scheduledDate && (
                  <div style={{ fontSize: 11.5, color: '#5a6e64', marginTop: 4 }}>
                    Scheduled Date: {new Date(receipt.delivery.scheduledDate).toLocaleDateString('en-PH')}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="receipt-footer-notes">
              <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Thank you for doing business with Food Supply Network!</p>
              <p style={{ margin: 0 }}>{receipt.notes}</p>
              <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#a0aba5' }}>
                System generated receipt · Document authenticity verified on Food Supply Network multi-tenant ledger.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════ BUSINESS VERIFICATION VIEW (TENANT & SUPPLIER) ════ */
function BusinessVerificationView({ token, me, onUpdateMe }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    businessType: 'Sole Proprietorship',
    registrationNumber: '',
    taxIdNumber: '',
    businessAddress: '',
    contactPhone: '',
    documentType: "Mayor's / Business Permit",
    documentNotes: '',
    fileName: '',
    fileData: '',
  });

  const loadStatus = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await request('/verification/my-status', token);
      setData(res);
      if (res.submission) {
        setFormData(prev => ({
          ...prev,
          businessType: res.submission.BusinessType || prev.businessType,
          registrationNumber: res.submission.RegistrationNumber || prev.registrationNumber,
          taxIdNumber: res.submission.TaxIdNumber || prev.taxIdNumber,
          businessAddress: res.submission.BusinessAddress || res.businessDetails?.address || prev.businessAddress,
          contactPhone: res.submission.ContactPhone || res.businessDetails?.contactNo || prev.contactPhone,
          documentType: res.submission.DocumentType || prev.documentType,
          documentNotes: res.submission.DocumentNotes || '',
          fileName: res.submission.DocumentFileName || '',
        }));
      } else if (res.businessDetails) {
        setFormData(prev => ({
          ...prev,
          businessAddress: res.businessDetails.address || '',
          contactPhone: res.businessDetails.contactNo || '',
          businessType: res.businessDetails.businessType || prev.businessType,
          registrationNumber: res.businessDetails.registrationNumber || '',
          taxIdNumber: res.businessDetails.taxIdNumber || '',
        }));
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('File is too large. Please upload a document under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(''); setSuccess('');

    if (!formData.registrationNumber.trim()) {
      setError('Business registration number (DTI/SEC/Permit No.) is required.');
      setSubmitting(false); return;
    }
    if (!formData.businessAddress.trim()) {
      setError('Business address is required.');
      setSubmitting(false); return;
    }
    if (!formData.contactPhone.trim()) {
      setError('Business contact phone is required.');
      setSubmitting(false); return;
    }

    try {
      const res = await request('/verification/submit', token, {
        method: 'POST',
        body: JSON.stringify({
          businessType: formData.businessType,
          registrationNumber: formData.registrationNumber.trim(),
          taxIdNumber: formData.taxIdNumber.trim(),
          businessAddress: formData.businessAddress.trim(),
          contactPhone: formData.contactPhone.trim(),
          documentType: formData.documentType,
          documentFileName: formData.fileName,
          documentFileData: formData.fileData,
          documentNotes: formData.documentNotes.trim(),
        }),
      });

      setSuccess(res.message || 'Verification submitted successfully!');
      if (onUpdateMe) {
        onUpdateMe({ ...me, VerificationStatus: 'Pending Verification' });
      }
      await loadStatus();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const currentStatus = data?.verificationStatus || me?.VerificationStatus || 'Pending Verification';

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Business Legitimacy Verification</h2>
          <p>Submit business registration credentials to verify your business and unlock full network capabilities.</p>
        </div>
      </div>

      {loading && <div className="loading-spinner"><RefreshCw size={28} className="spinning" /><p>Loading status…</p></div>}
      {error && <div className="error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="info"><CheckCircle size={16} /> {success}</div>}

      {!loading && (
        <div className="verif-grid">
          {/* Form */}
          <div className="verif-card">
            <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="#16774d" />
              {currentStatus === 'Verified' ? 'Verified Business Information' : 'Submit Verification Credentials'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Business / Shop Name</label>
                <input type="text" value={me?.ShopName || ''} disabled style={{ background: '#f5faf7' }} />
                <span className="field-hint">Registered business name in your profile.</span>
              </div>

              <div className="profile-fields-grid">
                <div className="input-group">
                  <label>Business Entity Type <span className="req">*</span></label>
                  <select
                    value={formData.businessType}
                    onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                    disabled={currentStatus === 'Verified'}
                  >
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Cooperative">Cooperative</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Registration Number (DTI / SEC / Permit) <span className="req">*</span></label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="e.g. DTI-BOH-12345 or 2026-0045"
                    required
                    disabled={currentStatus === 'Verified'}
                  />
                </div>
              </div>

              <div className="profile-fields-grid">
                <div className="input-group">
                  <label>Tax Identification Number (TIN / optional)</label>
                  <input
                    type="text"
                    value={formData.taxIdNumber}
                    onChange={e => setFormData({ ...formData, taxIdNumber: e.target.value })}
                    placeholder="e.g. 123-456-789-000"
                    disabled={currentStatus === 'Verified'}
                  />
                </div>

                <div className="input-group">
                  <label>Official Contact Phone <span className="req">*</span></label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="09XX-XXX-XXXX"
                    required
                    disabled={currentStatus === 'Verified'}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Official Registered Address <span className="req">*</span></label>
                <input
                  type="text"
                  value={formData.businessAddress}
                  onChange={e => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="Street, Barangay, City/Municipality, Bohol"
                  required
                  disabled={currentStatus === 'Verified'}
                />
              </div>

              <div className="input-group">
                <label>Supporting Document Type <span className="req">*</span></label>
                <select
                  value={formData.documentType}
                  onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                  disabled={currentStatus === 'Verified'}
                >
                  <option value="Mayor's / Business Permit">Mayor's / Business Permit</option>
                  <option value="DTI Certificate of Registration">DTI Certificate of Registration</option>
                  <option value="SEC Certificate of Incorporation">SEC Certificate of Incorporation</option>
                  <option value="BIR Certificate of Registration (Form 2303)">BIR Certificate of Registration (Form 2303)</option>
                  <option value="Sanitary / Health Inspection Permit">Sanitary / Health Inspection Permit</option>
                </select>
              </div>

              {currentStatus !== 'Verified' && (
                <div className="input-group">
                  <label>Upload Document Proof (PDF or Image, max 8MB)</label>
                  <label className="file-upload-zone">
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} />
                    <FileText size={32} color="#16774d" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <strong>Click to select document file</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#718078' }}>
                      Accepted formats: PDF, PNG, JPG (e.g. Scanned Mayor's Permit or DTI Certificate)
                    </p>
                  </label>
                  {formData.fileName && (
                    <div className="file-preview-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileCheck size={18} color="#16774d" />
                        <strong>{formData.fileName}</strong>
                      </div>
                      <span className="badge-active" style={{ fontSize: 11 }}>Ready to submit</span>
                    </div>
                  )}
                </div>
              )}

              <div className="input-group">
                <label>Additional Notes / Remarks (optional)</label>
                <textarea
                  rows={2}
                  value={formData.documentNotes}
                  onChange={e => setFormData({ ...formData, documentNotes: e.target.value })}
                  placeholder="Any additional details regarding your business permits, lease contracts, or business operations..."
                  disabled={currentStatus === 'Verified'}
                />
              </div>

              {currentStatus !== 'Verified' && (
                <button type="submit" className="submit-btn" disabled={submitting} style={{ marginTop: 12 }}>
                  {submitting ? (
                    <><RefreshCw size={16} className="spinning" /> Submitting Documents…</>
                  ) : (
                    <><ShieldCheck size={16} /> Submit for Business Verification</>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Status & Review Sidebar */}
          <div>
            <div className="verif-card" style={{ marginBottom: 20 }}>
              <div className="verif-status-header">
                <h3 style={{ margin: 0, fontSize: 15 }}>Current Status</h3>
                {currentStatus === 'Verified' && <VerifiedBadge size={14} large />}
                {currentStatus === 'Pending Verification' && <span className="badge badge-pending">Pending Review</span>}
                {currentStatus === 'Requires Additional Information' && <span className="badge" style={{ background: '#ffedd5', color: '#c2410c' }}>Requires Info</span>}
                {currentStatus === 'Rejected' && <span className="badge badge-inactive">Rejected</span>}
              </div>

              {currentStatus === 'Verified' && (
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                  <p><strong>✓ Legitimate Verified Business</strong></p>
                  <p>Your business credentials have been officially vetted. Verified badges are now active on your shop profile, catalog listings, and order receipts.</p>
                </div>
              )}

              {currentStatus === 'Pending Verification' && (
                <div style={{ fontSize: 13, color: '#92400e', lineHeight: 1.5 }}>
                  <p><strong>Application Under Review</strong></p>
                  <p>An administrator is currently reviewing your registration number and documents. You will receive an update once approved.</p>
                </div>
              )}

              {currentStatus === 'Requires Additional Information' && (
                <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.5 }}>
                  <p><strong>Action Required</strong></p>
                  <p>Please update your information or upload the requested documents using the form.</p>
                  {data?.submission?.AdminNotes && (
                    <div className="banner-reason-box" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', marginTop: 8 }}>
                      <strong>Administrator Note:</strong><br />
                      "{data.submission.AdminNotes}"
                    </div>
                  )}
                </div>
              )}

              {currentStatus === 'Rejected' && (
                <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5 }}>
                  <p><strong>Application Rejected</strong></p>
                  <p>Your previous verification was rejected. You may correct your business details and re-submit.</p>
                  {data?.submission?.AdminNotes && (
                    <div className="banner-reason-box" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginTop: 8 }}>
                      <strong>Reason for Rejection:</strong><br />
                      "{data.submission.AdminNotes}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="verif-card">
              <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#495f54', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                Why Business Verification?
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#5a6e64', lineHeight: 1.6 }}>
                <li>Ensures all marketplace tenants and suppliers are legally registered entities.</li>
                <li>Displays the official <strong>Verified Business</strong> trust badge to prospective buyers.</li>
                <li>Unlocks high-value order processing, automated invoicing, and dispatch scheduling.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ ADMIN BUSINESS VERIFICATIONS TAB ═════════════════ */
function AdminVerificationsView({ token, onRefreshOverview }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Review modal state
  const [reviewItem, setReviewItem] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionPrompt, setActionPrompt] = useState(null); // 'reject' | 'request_info'

  const loadList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const q = statusFilter !== 'All' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const data = await request(`/verification/admin/list${q}`, token);
      setList(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [token, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleDecision = async (action, reason = '') => {
    if (!reviewItem) return;
    setActionBusy(true); setActionError('');
    try {
      await request(`/verification/admin/${reviewItem.VerificationID}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      });
      setReviewItem(null);
      setActionPrompt(null);
      setActionReason('');
      await loadList();
      if (onRefreshOverview) onRefreshOverview();
    } catch (err) { setActionError(err.message); }
    finally { setActionBusy(false); }
  };

  const filtered = list.filter(item => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.BusinessName?.toLowerCase().includes(s) ||
      item.ApplicantName?.toLowerCase().includes(s) ||
      item.RegistrationNumber?.toLowerCase().includes(s) ||
      item.Role?.toLowerCase().includes(s)
    );
  });

  const pendingCount = list.filter(i => i.Status === 'Pending Verification').length;
  const verifiedCount = list.filter(i => i.Status === 'Verified').length;
  const rejectedCount = list.filter(i => i.Status === 'Rejected' || i.Status === 'Requires Additional Information').length;

  return (
    <div>
      <div className="section-header">
        <div>
          <h2>Business Legitimacy Verification Management</h2>
          <p>Review business permit filings, authenticate registration numbers, and manage verified legitimacy statuses.</p>
        </div>
        <button className="refresh" onClick={loadList}><RefreshCw size={14} /> Refresh Submissions</button>
      </div>

      {error && <div className="error"><AlertCircle size={16} /> {error}</div>}

      <div className="metrics" style={{ marginBottom: 20 }}>
        <article><span>Pending Review</span><strong style={{ color: '#b45309' }}>{pendingCount}</strong></article>
        <article><span>Verified Businesses</span><strong style={{ color: '#16774d' }}>{verifiedCount}</strong></article>
        <article><span>Requires Action / Rejected</span><strong>{rejectedCount}</strong></article>
      </div>

      <div className="verif-filters">
        {['All', 'Pending Verification', 'Verified', 'Requires Additional Information', 'Rejected'].map(s => (
          <button
            key={s}
            type="button"
            className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter by business name, applicant, or registration #..."
          style={{ width: '100%', maxWidth: 400, padding: '9px 12px', borderRadius: 8, border: '1px solid #d9e4dc' }}
        />
      </div>

      {loading && <div className="loading-spinner"><RefreshCw size={28} className="spinning" /><p>Loading applications…</p></div>}

      {!loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Account Role</th>
                <th>Contact Person</th>
                <th>Registration # / TIN</th>
                <th>Document Type</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.VerificationID}>
                  <td>
                    <strong>{item.BusinessName}</strong>
                    <div style={{ fontSize: 11, color: '#718078' }}>{item.BusinessType}</div>
                  </td>
                  <td>
                    <span className="category-tag">{item.Role === 'Supplier' ? 'Food Supplier' : 'Business Owner'}</span>
                  </td>
                  <td>
                    <div>{item.ApplicantName || '—'}</div>
                    <small style={{ color: '#718078' }}>{item.ContactPhone}</small>
                  </td>
                  <td>
                    <code>{item.RegistrationNumber}</code>
                    {item.TaxIdNumber && <div style={{ fontSize: 11, color: '#718078' }}>TIN: {item.TaxIdNumber}</div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FileText size={13} color="#16774d" />
                      <span>{item.DocumentType}</span>
                    </div>
                    {item.DocumentFileName && (
                      <small style={{ color: '#718078' }}>{item.DocumentFileName}</small>
                    )}
                  </td>
                  <td>
                    {item.Status === 'Verified' && <span className="badge badge-active">Verified</span>}
                    {item.Status === 'Pending Verification' && <span className="badge badge-pending">Pending</span>}
                    {item.Status === 'Requires Additional Information' && <span className="badge" style={{ background: '#ffedd5', color: '#c2410c' }}>Needs Info</span>}
                    {item.Status === 'Rejected' && <span className="badge badge-inactive">Rejected</span>}
                  </td>
                  <td>{new Date(item.CreatedAt).toLocaleDateString('en-PH')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-update"
                      onClick={() => { setReviewItem(item); setActionPrompt(null); setActionReason(''); setActionError(''); }}
                    >
                      <ShieldCheck size={13} /> Review Details
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#718078' }}>
                    No business verification records match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && (
        <Modal title={`Review Verification: ${reviewItem.BusinessName}`} onClose={() => { setReviewItem(null); setActionPrompt(null); }} wide>
          {actionError && <div className="error"><AlertCircle size={16} /> {actionError}</div>}

          <div className="order-detail-grid" style={{ marginBottom: 18 }}>
            <div>
              <div className="detail-label">Business Name</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{reviewItem.BusinessName}</div>
            </div>
            <div>
              <div className="detail-label">Role &amp; Entity Type</div>
              <div>{reviewItem.Role === 'Supplier' ? 'Food Supplier' : 'Business Owner'} ({reviewItem.BusinessType})</div>
            </div>
            <div>
              <div className="detail-label">Registration Number</div>
              <div><code>{reviewItem.RegistrationNumber}</code></div>
            </div>
            <div>
              <div className="detail-label">Tax ID Number (TIN)</div>
              <div>{reviewItem.TaxIdNumber ? <code>{reviewItem.TaxIdNumber}</code> : 'None provided'}</div>
            </div>
            <div>
              <div className="detail-label">Applicant / Contact</div>
              <div>{reviewItem.ApplicantName} ({reviewItem.ContactPhone})</div>
            </div>
            <div>
              <div className="detail-label">Applicant Email</div>
              <div>{reviewItem.ApplicantEmail}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div className="detail-label">Business Address</div>
              <div>{reviewItem.BusinessAddress}</div>
            </div>
          </div>

          <div className="verif-card" style={{ background: '#f9fbf9', margin: '14px 0' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#314b3f' }}>SUBMITTED PROOF OF LEGITIMACY</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileCheck size={28} color="#16774d" />
                <div>
                  <div style={{ fontWeight: 700 }}>{reviewItem.DocumentType}</div>
                  <div style={{ fontSize: 12, color: '#6b7c73' }}>
                    File: <strong>{reviewItem.DocumentFileName || 'permit_document.pdf'}</strong>
                  </div>
                </div>
              </div>
              {reviewItem.DocumentFileUrl ? (
                <a
                  href={reviewItem.DocumentFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-update"
                  style={{ textDecoration: 'none' }}
                >
                  <Eye size={13} /> View Attached Document
                </a>
              ) : (
                <span className="badge badge-neutral">Electronic Registration Record</span>
              )}
            </div>
            {reviewItem.DocumentNotes && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: '#55685e', fontStyle: 'italic' }}>
                Applicant Notes: "{reviewItem.DocumentNotes}"
              </div>
            )}
          </div>

          {reviewItem.AdminNotes && (
            <div className="banner-reason-box" style={{ background: '#fffbeb', border: '1px solid #fde68a', margin: '12px 0' }}>
              <strong>Previous Administrator Feedback:</strong><br />
              "{reviewItem.AdminNotes}"
            </div>
          )}

          {/* Prompt action input when rejecting or requesting info */}
          {actionPrompt && (
            <div className="verif-card" style={{ background: '#fff8f6', border: '1px solid #fecaca', margin: '16px 0' }}>
              <h4 style={{ margin: '0 0 6px', color: actionPrompt === 'reject' ? '#991b1b' : '#c2410c' }}>
                {actionPrompt === 'reject' ? 'Reason for Rejection (Required)' : 'Specific Information Requested (Required)'}
              </h4>
              <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#60716a' }}>
                {actionPrompt === 'reject'
                  ? 'Please clearly state why this legitimacy verification is being rejected (e.g. Expired Mayor’s Permit, Mismatched DTI registration name).'
                  : 'Specify what documents or details the business must provide to satisfy verification criteria.'
                }
              </p>
              <textarea
                rows={3}
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="Type descriptive reason or instructions here..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #fca5a5' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="submit-btn"
                  style={{ background: actionPrompt === 'reject' ? '#dc2626' : '#ea580c' }}
                  disabled={actionBusy || actionReason.trim().length < 5}
                  onClick={() => handleDecision(actionPrompt, actionReason)}
                >
                  {actionBusy ? 'Processing…' : `Confirm ${actionPrompt === 'reject' ? 'Rejection' : 'Request'}`}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => { setActionPrompt(null); setActionReason(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Admin Decision Actions */}
          {!actionPrompt && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20, borderTop: '1px solid #edf0ed', paddingTop: 16 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={actionBusy || reviewItem.Status === 'Verified'}
                onClick={() => handleDecision('approve')}
              >
                <Check size={16} /> Approve &amp; Verify Business
              </button>

              <button
                type="button"
                className="btn-update"
                style={{ color: '#c2410c', borderColor: '#fed7aa', background: '#fff7ed' }}
                disabled={actionBusy}
                onClick={() => setActionPrompt('request_info')}
              >
                <AlertCircle size={14} /> Request More Information
              </button>

              <button
                type="button"
                className="btn-icon remove"
                disabled={actionBusy}
                onClick={() => setActionPrompt('reject')}
              >
                <X size={14} /> Reject Application
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════ BUSINESS OWNER APP ══════════════════════════════ */
function BusinessOwnerApp({ token, me, onLogout, onUpdateMe }) {
  const [tab, setTab]          = useState('dashboard');
  const [orders, setOrders]    = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError]      = useState('');
  const [busy, setBusy]        = useState(false);

  // Cart state
  const [cart, setCart]        = useState([]); // [{product, quantity}]
  const [cartOpen, setCartOpen] = useState(false);

  // Modal states
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierDetail,   setSupplierDetail]   = useState(null);
  const [loadingSupplier,  setLoadingSupplier]  = useState(false);
  const [selectedOrder,    setSelectedOrder]    = useState(null);
  const [orderDetail,      setOrderDetail]      = useState(null);
  const [loadingOrder,     setLoadingOrder]     = useState(false);
  const [payModal,         setPayModal]         = useState(null); // order obj
  const [payMethod,        setPayMethod]        = useState('gcash');
  const [paying,           setPaying]           = useState(false);
  const [payResult,        setPayResult]        = useState(null);
  const [receiptOrderId,   setReceiptOrderId]   = useState(null);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [o, s] = await Promise.all([
        request('/orders', token),
        request('/suppliers', token),
      ]);
      setOrders(o);
      setSuppliers(s);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Supplier detail modal
  const openSupplier = async (sup) => {
    setSelectedSupplier(sup);
    setLoadingSupplier(true);
    try {
      const d = await request(`/suppliers/${sup.SupplierID}`, token);
      setSupplierDetail(d);
    } catch (e) { setError(e.message); }
    finally { setLoadingSupplier(false); }
  };

  // Order detail modal
  const openOrder = async (ord) => {
    setSelectedOrder(ord);
    setLoadingOrder(true);
    try {
      const d = await request(`/orders/${ord.OrderID}`, token);
      setOrderDetail(d);
    } catch (e) { setError(e.message); }
    finally { setLoadingOrder(false); }
  };

  // Cart helpers
  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.ProductID === product.ProductID);
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, product.Stock);
        return prev.map(i => i.product.ProductID === product.ProductID ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { product, quantity: Math.min(qty, product.Stock) }];
    });
  };
  const updateCartQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(i => i.product.ProductID === productId
      ? { ...i, quantity: Math.min(qty, i.product.Stock) } : i));
  };
  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product.ProductID !== productId));
  const cartTotal = cart.reduce((s, i) => s + i.product.Price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Checkout
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setCheckoutBusy(true); setCheckoutError('');
    try {
      const result = await request('/orders', token, {
        method: 'POST',
        body: JSON.stringify({ items: cart.map(i => ({ productId: i.product.ProductID, quantity: i.quantity })) }),
      });
      setCart([]);
      setCartOpen(false);
      await load();
      if (result.orders?.length > 0) {
        const firstOrderId = result.orders[0].orderId;
        setPayModal({ OrderID: firstOrderId, TotalAmount: result.orders[0].total });
        setPayResult(null);
      }
    } catch (e) { setCheckoutError(e.message); }
    finally { setCheckoutBusy(false); }
  };

  // Payment
  const handlePay = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      const result = await request(`/orders/${payModal.OrderID}/pay`, token, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: payMethod }),
      });
      setPayResult({ success: true, message: result.message, status: result.paymentStatus, orderId: payModal.OrderID });
      await load();
    } catch (e) { setPayResult({ success: false, message: e.message }); }
    finally { setPaying(false); }
  };

  const totalSpent    = orders.reduce((s, o) => s + Number(o.TotalAmount), 0);
  const pendingOrders = orders.filter(o => o.Status === 'Pending').length;

  const isVerified = me?.VerificationStatus === 'Verified';

  const TABS = [
    ['dashboard',    LayoutDashboard, 'Overview'],
    ['shops',        Store,           'Browse Shops'],
    ['orders',       ShoppingCart,    'My Orders'],
    ['verification', ShieldCheck,     'Business Verification'],
    ['profile',      User,            'My Profile'],
  ];

  return (
    <Shell me={me} onLogout={onLogout} onRefresh={load} busy={busy}
      tabs={TABS} activeTab={tab} setTab={setTab}>
      {error && <div className="error">{error}</div>}

      {/* Verification Alert Banner */}
      <VerificationBanner me={me} onNavigateToVerification={() => setTab('verification')} />

      {/* Floating cart button */}
      {tab === 'shops' && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <ShoppingCart size={20} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          {cartCount > 0 && <span className="cart-fab-total">{fmt(cartTotal)}</span>}
        </button>
      )}

      {/* ── Overview ── */}
      {tab === 'dashboard' && (
        <>
          <div className="metrics">
            <article><span>Total orders placed</span><strong>{orders.length}</strong></article>
            <article><span>Pending orders</span><strong>{pendingOrders}</strong></article>
            <article><span>Total spent</span><strong>{fmt(totalSpent)}</strong></article>
          </div>
          <section>
            <h2>Your workspace</h2>
            <p>Browse supplier shops on the network, add products to your cart, and manage your food supply chain.</p>
          </section>
        </>
      )}

      {/* ── Browse Shops (Real-Time Network Sync) ── */}
      {tab === 'shops' && (
        <section>
          <h2>Shops on the Network</h2>
          <p>Browse registered food suppliers. Verified suppliers display an authenticated legitimacy badge.</p>
          <div className="shop-grid">
            {suppliers.map(s => (
              <div key={s.SupplierID} className="shop-card shop-card-clickable" onClick={() => openSupplier(s)}>
                <div className="shop-card-header">
                  <div className="shop-avatar">
                    <Store size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong>{s.SupplierName}</strong>
                      {s.VerificationStatus === 'Verified' ? (
                        <VerifiedBadge size={12} />
                      ) : (
                        <span className="badge-unverified">Pending</span>
                      )}
                    </div>
                    <div className="shop-product-count">{s.ProductCount} product{s.ProductCount !== 1 ? 's' : ''} available</div>
                  </div>
                </div>

                {/* Real-time synchronized Shop Description */}
                {s.Description && (
                  <p className="shop-card-description">{s.Description}</p>
                )}

                {s.Categories && (
                  <div className="shop-categories">
                    {s.Categories.split(', ').map(c => <span key={c} className="category-tag">{c}</span>)}
                  </div>
                )}
                {s.ContactNo && (
                  <div className="shop-detail"><Phone size={13} /><span>{s.ContactNo}</span></div>
                )}
                {s.Address && (
                  <div className="shop-detail"><MapPin size={13} /><span>{s.Address}</span></div>
                )}
                <div className="shop-cta">View Products <ChevronRight size={14} /></div>
              </div>
            ))}
            {!suppliers.length && <p>No suppliers currently registered on the network.</p>}
          </div>
        </section>
      )}

      {/* ── My Orders ── */}
      {tab === 'orders' && (
        <section>
          <h2>My Orders</h2>
          <p>Review orders placed with food suppliers, check payment and fulfillment statuses, and access official receipts.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th><th>Date</th><th>Supplier</th>
                  <th>Status</th><th>Delivery</th><th>Payment</th><th>Total</th><th>Receipt</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.OrderID} className="clickable-row" onClick={() => openOrder(o)}>
                    <td>#{o.OrderID}</td>
                    <td>{new Date(o.OrderDate).toLocaleDateString('en-PH')}</td>
                    <td>{o.SupplierName || '—'}</td>
                    <td><StatusBadge value={o.Status} map={ORDER_STATUS_MAP} /></td>
                    <td>
                      {o.DeliveryStatus
                        ? <StatusBadge value={o.DeliveryStatus} map={DELIVERY_STATUS_MAP} />
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      {o.PaymentStatus
                        ? <StatusBadge value={o.PaymentStatus} map={PAYMENT_STATUS_MAP} />
                        : <span className="muted">—</span>}
                    </td>
                    <td>{fmt(o.TotalAmount)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-update"
                        style={{ padding: '5px 9px', fontSize: 11.5 }}
                        onClick={() => setReceiptOrderId(o.OrderID)}
                        title="View & Print Official Order Receipt"
                      >
                        <FileText size={12} /> Receipt
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" title="View details"><Eye size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!orders.length && <p>No orders yet. Browse shops to start ordering!</p>}
        </section>
      )}

      {/* ── Business Verification Tab ── */}
      {tab === 'verification' && (
        <section>
          <BusinessVerificationView token={token} me={me} onUpdateMe={onUpdateMe} />
        </section>
      )}

      {/* ── Dedicated Profile Tab ── */}
      {tab === 'profile' && (
        <ProfileTab me={me} token={token} onUpdateMe={onUpdateMe} />
      )}

      {/* ── Supplier Detail Modal ── */}
      {selectedSupplier && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{selectedSupplier.SupplierName}</span>
              {selectedSupplier.VerificationStatus === 'Verified' && <VerifiedBadge size={13} />}
            </div>
          }
          onClose={() => { setSelectedSupplier(null); setSupplierDetail(null); }}
          wide
        >
          {loadingSupplier && <div className="loading-spinner"><RefreshCw size={24} className="spinning" /></div>}
          {supplierDetail && (
            <>
              {supplierDetail.Description && (
                <div className="supplier-modal-desc-box">
                  <p>{supplierDetail.Description}</p>
                </div>
              )}
              <div className="supplier-meta">
                {supplierDetail.ContactNo && <div className="shop-detail"><Phone size={13} /><span>{supplierDetail.ContactNo}</span></div>}
                {supplierDetail.Address   && <div className="shop-detail"><MapPin size={13} /><span>{supplierDetail.Address}</span></div>}
              </div>
              <h3 style={{ margin: '18px 0 10px' }}>Available Products</h3>
              {supplierDetail.products.length === 0 && <p className="muted-text">No products available in this store.</p>}
              <div className="product-grid">
                {supplierDetail.products.map(p => {
                  const cartItem = cart.find(i => i.product.ProductID === p.ProductID);
                  return (
                    <div key={p.ProductID} className="product-card">
                      <div className="product-card-cat">{p.CategoryName}</div>
                      <div className="product-card-name">{p.ProductName}</div>
                      <div className="product-card-price">{fmt(p.Price)}</div>
                      <div className="product-card-stock">
                        {p.Stock > 0
                          ? <span className={p.Stock <= 10 ? 'low-stock' : 'in-stock'}>{p.Stock} in stock</span>
                          : <span className="out-of-stock">Out of stock</span>}
                      </div>
                      {cartItem ? (
                        <div className="qty-controls">
                          <button onClick={() => updateCartQty(p.ProductID, cartItem.quantity - 1)}><Minus size={14} /></button>
                          <span>{cartItem.quantity}</span>
                          <button onClick={() => updateCartQty(p.ProductID, cartItem.quantity + 1)}
                            disabled={cartItem.quantity >= p.Stock}><Plus size={14} /></button>
                        </div>
                      ) : (
                        <button className="btn-add-cart" onClick={() => addToCart(p)} disabled={p.Stock === 0}>
                          <ShoppingCart size={14} /> Add to Cart
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {cart.length > 0 && (
                <div className="cart-summary-bar">
                  <span>{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</span>
                  <strong>{fmt(cartTotal)}</strong>
                  <button className="btn-checkout-sm" onClick={() => { setSelectedSupplier(null); setCartOpen(true); }}>
                    <ShoppingCart size={14} /> View Cart
                  </button>
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ── Cart Modal ── */}
      {cartOpen && (
        <Modal title="Your Cart" onClose={() => setCartOpen(false)} wide>
          {cart.length === 0 && <p className="muted-text">Your cart is empty.</p>}
          {cart.length > 0 && (
            <form onSubmit={handleCheckout}>
              <div className="cart-items">
                {cart.map(({ product: p, quantity }) => (
                  <div key={p.ProductID} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{p.ProductName}</div>
                      <div className="cart-item-supplier muted-text">{fmt(p.Price)} each</div>
                    </div>
                    <div className="qty-controls">
                      <button type="button" onClick={() => updateCartQty(p.ProductID, quantity - 1)}><Minus size={14} /></button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => updateCartQty(p.ProductID, quantity + 1)}
                        disabled={quantity >= p.Stock}><Plus size={14} /></button>
                    </div>
                    <div className="cart-item-subtotal">{fmt(p.Price * quantity)}</div>
                    <button type="button" className="btn-icon remove" onClick={() => removeFromCart(p.ProductID)}><X size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="cart-total-row">
                <span>Total</span>
                <strong>{fmt(cartTotal)}</strong>
              </div>
              {checkoutError && <div className="error"><AlertCircle size={16} /> {checkoutError}</div>}

              {/* Legitimacy Verification Guard */}
              {!isVerified && (
                <div className="validation-warning" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: 12, borderRadius: 8, margin: '14px 0' }}>
                  <strong><AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Business Verification Required</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                    Your business is currently pending legitimacy verification. You must submit your business permit or registration credentials to place orders.
                  </p>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontWeight: 700, marginTop: 6, display: 'inline-block' }}
                    onClick={() => { setCartOpen(false); setTab('verification'); }}
                  >
                    Submit Business Verification Proof →
                  </button>
                </div>
              )}

              <p className="cart-note">
                Note: Products from different suppliers will create separate orders.
              </p>
              <button type="submit" className="submit-btn" disabled={checkoutBusy || !isVerified}>
                {checkoutBusy ? 'Placing order…' : <><PackageCheck size={16} /> Place Order &amp; Proceed to Payment</>}
              </button>
            </form>
          )}
        </Modal>
      )}

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <Modal title={`Order #${selectedOrder.OrderID}`} onClose={() => { setSelectedOrder(null); setOrderDetail(null); }} wide>
          {loadingOrder && <div className="loading-spinner"><RefreshCw size={24} className="spinning" /></div>}
          {orderDetail && (
            <>
              <div className="order-detail-grid">
                <div>
                  <div className="detail-label">Order Date</div>
                  <div>{new Date(orderDetail.OrderDate).toLocaleString('en-PH')}</div>
                </div>
                <div>
                  <div className="detail-label">Supplier</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{orderDetail.SupplierName}</span>
                    {orderDetail.SupplierVerificationStatus === 'Verified' && <VerifiedBadge size={12} />}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Order Status</div>
                  <div><StatusBadge value={orderDetail.Status} map={ORDER_STATUS_MAP} /></div>
                </div>
                <div>
                  <div className="detail-label">Payment</div>
                  <div>
                    {orderDetail.PaymentStatus
                      ? <StatusBadge value={orderDetail.PaymentStatus} map={PAYMENT_STATUS_MAP} />
                      : <span className="muted">No invoice</span>}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Delivery Status</div>
                  <div>
                    {orderDetail.DeliveryStatus
                      ? <StatusBadge value={orderDetail.DeliveryStatus} map={DELIVERY_STATUS_MAP} />
                      : <span className="muted">Not scheduled</span>}
                  </div>
                </div>
                {orderDetail.ScheduledDate && (
                  <div>
                    <div className="detail-label">Scheduled Date</div>
                    <div>{new Date(orderDetail.ScheduledDate).toLocaleDateString('en-PH')}</div>
                  </div>
                )}
              </div>

              <h3 style={{ margin: '18px 0 10px' }}>Items Ordered</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {orderDetail.items.map(item => (
                      <tr key={item.OrderDetailID}>
                        <td>{item.ProductName}</td>
                        <td>{item.CategoryName}</td>
                        <td>{item.Quantity}</td>
                        <td>{fmt(item.Price)}</td>
                        <td>{fmt(item.Price * item.Quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="cart-total-row" style={{ marginTop: 12 }}>
                <span>Order Total</span>
                <strong>{fmt(orderDetail.TotalAmount)}</strong>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-update"
                  style={{ padding: '9px 14px', fontSize: 13 }}
                  onClick={() => setReceiptOrderId(orderDetail.OrderID)}
                >
                  <FileText size={15} /> View Official Receipt
                </button>

                {orderDetail.PaymentStatus && orderDetail.PaymentStatus !== 'Paid' && (
                  <button className="submit-btn" style={{ margin: 0 }}
                    onClick={() => { setSelectedOrder(null); setOrderDetail(null); setPayModal(orderDetail); setPayResult(null); }}>
                    <CreditCard size={16} /> Pay Now
                  </button>
                )}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── Payment Modal ── */}
      {payModal && (
        <Modal title="Complete Payment" onClose={() => { setPayModal(null); setPayResult(null); }}>
          {payResult ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {payResult.success
                ? <CheckCircle size={48} color="#16774d" style={{ margin: '0 auto 12px', display: 'block' }} />
                : <AlertCircle size={48} color="#9c3227" style={{ margin: '0 auto 12px', display: 'block' }} />}
              <p style={{ fontWeight: 700, fontSize: 16 }}>{payResult.message}</p>
              {payResult.status && <StatusBadge value={payResult.status} map={PAYMENT_STATUS_MAP} />}
              
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
                {payResult.orderId && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => { setReceiptOrderId(payResult.orderId); setPayModal(null); setPayResult(null); }}
                  >
                    <FileText size={15} /> View Receipt
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => { setPayModal(null); setPayResult(null); }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <p>Order <strong>#{payModal.OrderID}</strong> — Total: <strong>{fmt(payModal.TotalAmount)}</strong></p>
              <p className="payment-note">
                🔒 Sandbox mode — no real money is charged.
              </p>
              <div className="payment-methods">
                {[
                  { id: 'gcash', label: 'GCash' },
                  { id: 'maya',  label: 'Maya' },
                  { id: 'card',  label: 'Credit / Debit Card' },
                  { id: 'cod',   label: 'Cash on Delivery' },
                ].map(m => (
                  <label key={m.id} className={`payment-option ${payMethod === m.id ? 'selected' : ''}`}>
                    <input type="radio" name="payMethod" value={m.id}
                      checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} />
                    {m.label}
                  </label>
                ))}
              </div>
              <button className="submit-btn" style={{ marginTop: 16 }} onClick={handlePay} disabled={paying}>
                {paying ? 'Processing…' : <><CreditCard size={16} /> Confirm Payment</>}
              </button>
            </>
          )}
        </Modal>
      )}

      {/* ── Order Receipt Modal ── */}
      {receiptOrderId && (
        <ReceiptModal orderId={receiptOrderId} token={token} onClose={() => setReceiptOrderId(null)} />
      )}
    </Shell>
  );
}

/* ══════════════════ SUPPLIER APP ════════════════════════════════════ */
function SupplierApp({ token, me, onLogout, onUpdateMe }) {
  const [tab,         setTab]         = useState('dashboard');
  const [products,    setProducts]    = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [error,       setError]       = useState('');
  const [busy,        setBusy]        = useState(false);
  const [receiptOrderId, setReceiptOrderId] = useState(null);

  // Add product modal
  const [addModal,  setAddModal]  = useState(false);
  const [formData,  setFormData]  = useState({ productName: '', categoryId: '', price: '', stock: '' });
  const [addBusy,   setAddBusy]   = useState(false);
  const [addError,  setAddError]  = useState('');

  // Delivery update
  const [deliveryModal, setDeliveryModal]   = useState(null); // order obj
  const [delStatus,     setDelStatus]       = useState('Scheduled');
  const [delDate,       setDelDate]         = useState('');
  const [delBusy,       setDelBusy]         = useState(false);
  const [delError,      setDelError]        = useState('');

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [p, o, c] = await Promise.all([
        request('/products',   token),
        request('/orders',     token),
        request('/categories', token),
      ]);
      setProducts(p); setOrders(o); setCategories(c);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue  = orders.reduce((s, o) => s + Number(o.TotalAmount), 0);
  const pendingOrders = orders.filter(o => o.Status === 'Pending' || o.Status === 'Confirmed').length;
  const lowStock      = products.filter(p => p.Stock <= 10).length;

  const isVerified = me?.VerificationStatus === 'Verified';

  const handleAddProduct = async (e) => {
    e.preventDefault(); setAddBusy(true); setAddError('');
    try {
      await request('/products', token, {
        method: 'POST',
        body: JSON.stringify({
          productName: formData.productName.trim(),
          categoryId:  Number(formData.categoryId),
          price:       Number(formData.price),
          stock:       Number(formData.stock),
        }),
      });
      setAddModal(false);
      setFormData({ productName: '', categoryId: '', price: '', stock: '' });
      await load();
    } catch (e) { setAddError(e.message); }
    finally { setAddBusy(false); }
  };

  const handleDeliveryUpdate = async (e) => {
    e.preventDefault(); setDelBusy(true); setDelError('');
    try {
      await request(`/orders/${deliveryModal.OrderID}/delivery`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: delStatus, scheduledDate: delDate || undefined }),
      });
      setDeliveryModal(null);
      await load();
    } catch (e) { setDelError(e.message); }
    finally { setDelBusy(false); }
  };

  const openDeliveryModal = (order) => {
    setDeliveryModal(order);
    setDelStatus(order.DeliveryStatus || 'Scheduled');
    setDelDate(order.ScheduledDate ? order.ScheduledDate.slice(0, 16) : '');
    setDelError('');
  };

  const officialShopName = me?.ShopName || me?.SupplierName || 'Supplier Store';

  const TABS = [
    ['dashboard',    LayoutDashboard, 'Overview'],
    ['products',     Package,         'My Products'],
    ['orders',       ClipboardList,   'Orders & Shipments'],
    ['verification', ShieldCheck,     'Business Verification'],
    ['profile',      User,            'Shop Profile'],
  ];

  return (
    <Shell me={me} onLogout={onLogout} onRefresh={load} busy={busy}
      tabs={TABS} activeTab={tab} setTab={setTab}>
      {error && <div className="error">{error}</div>}

      {/* Verification Status Alert Banner */}
      <VerificationBanner me={me} onNavigateToVerification={() => setTab('verification')} />

      {/* ── Overview ── */}
      {tab === 'dashboard' && (
        <>
          <div className="metrics">
            <article><span>Active products</span><strong>{products.filter(p => p.IsActive).length}</strong></article>
            <article><span>Orders to fulfil</span><strong>{pendingOrders}</strong></article>
            <article><span>Low stock items (≤ 10)</span><strong>{lowStock}</strong></article>
          </div>
          <div className="metrics">
            <article><span>Total orders received</span><strong>{orders.length}</strong></article>
            <article><span>Total revenue</span><strong>{fmt(totalRevenue)}</strong></article>
          </div>
          <section>
            <h2>Your supplier workspace</h2>
            <p>Manage your product listings and track incoming orders with their shipment destinations.</p>
          </section>
        </>
      )}

      {/* ── My Products (with Prominent Shop Identity Banner) ── */}
      {tab === 'products' && (
        <section>
          {/* Prominent Shop Identity Welcome Banner */}
          <div className="shop-identity-banner">
            <div className="shop-identity-avatar">
              <Store size={32} />
            </div>
            <div className="shop-identity-content">
              <div className="shop-identity-badge">CURRENT STORE INVENTORY</div>
              <h2 className="shop-identity-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{officialShopName}</span>
                {isVerified ? (
                  <VerifiedBadge size={14} large />
                ) : (
                  <span className="badge-unverified">Pending Verification</span>
                )}
              </h2>
              <p className="shop-identity-desc">
                {me?.Description || 'Managing official food catalog and active inventory levels on the network.'}
              </p>
              <div className="shop-identity-meta-row">
                {me?.ContactNo && (
                  <span className="shop-identity-pill"><Phone size={13} /> {me.ContactNo}</span>
                )}
                {me?.Address && (
                  <span className="shop-identity-pill"><MapPin size={13} /> {me.Address}</span>
                )}
              </div>
            </div>
          </div>

          {!isVerified && (
            <div className="validation-warning" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: 12, borderRadius: 8, margin: '18px 0 0' }}>
              <strong><AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Business Verification Required</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                Your supplier account must be verified before listing products in the catalog and accepting orders.
              </p>
              <button
                type="button"
                className="link-btn"
                style={{ fontWeight: 700, marginTop: 6, display: 'inline-block' }}
                onClick={() => setTab('verification')}
              >
                Submit Business Verification Credentials →
              </button>
            </div>
          )}

          <div className="section-header" style={{ marginTop: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Product Catalog</h3>
              <p style={{ margin: '4px 0 0', color: '#718078', fontSize: 13 }}>
                Live products listed for <strong>{officialShopName}</strong>
              </p>
            </div>
            <button
              className="btn-primary"
              disabled={!isVerified}
              title={!isVerified ? 'Business verification required to add products' : ''}
              onClick={() => { setAddModal(true); setAddError(''); }}
            >
              <Plus size={16} /> Add Product
            </button>
          </div>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.ProductID}>
                    <td><strong>{p.ProductName}</strong></td>
                    <td><span className="category-tag">{p.CategoryName}</span></td>
                    <td>{fmt(p.Price)}</td>
                    <td><span className={p.Stock <= 10 ? 'low-stock' : ''}>{p.Stock} units</span></td>
                    <td>
                      <StatusBadge value={p.IsActive ? 'Active' : 'Inactive'}
                        map={{ Active: { cls: 'badge-active', label: 'Active' }, Inactive: { cls: 'badge-inactive', label: 'Inactive' } }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!products.length && <p style={{ marginTop: 16 }}>No products listed yet. Click "Add Product" to get started.</p>}
        </section>
      )}

      {/* ── Orders & Shipments ── */}
      {tab === 'orders' && (
        <section>
          <h2>Orders &amp; Shipments</h2>
          <p>Incoming customer orders with delivery destinations. Click "Update Delivery" to change shipment status or "Receipt" to review and print official receipts.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th><th>Date</th><th>Ship To</th><th>Address</th>
                  <th>Delivery</th><th>Order Status</th><th>Payment</th><th>Total</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.OrderID}>
                    <td>#{o.OrderID}</td>
                    <td>{new Date(o.OrderDate).toLocaleDateString('en-PH')}</td>
                    <td>
                      <div className="ship-to">
                        <strong>{o.BusinessName || '—'}</strong>
                        {o.StallNumber && <small>Stall {o.StallNumber}</small>}
                      </div>
                    </td>
                    <td className="addr-cell">{o.Address || '—'}</td>
                    <td>
                      {o.DeliveryStatus
                        ? <StatusBadge value={o.DeliveryStatus} map={DELIVERY_STATUS_MAP} />
                        : <span className="muted">Not set</span>}
                      {o.ScheduledDate && (
                        <div className="sub-date">{new Date(o.ScheduledDate).toLocaleDateString('en-PH')}</div>
                      )}
                    </td>
                    <td><StatusBadge value={o.Status} map={ORDER_STATUS_MAP} /></td>
                    <td>
                      {o.PaymentStatus
                        ? <StatusBadge value={o.PaymentStatus} map={PAYMENT_STATUS_MAP} />
                        : <span className="muted">—</span>}
                    </td>
                    <td>{fmt(o.TotalAmount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-update" onClick={() => openDeliveryModal(o)}>
                          <Truck size={13} /> Dispatch
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setReceiptOrderId(o.OrderID)}
                          title="View & Print Order Receipt"
                        >
                          <FileText size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!orders.length && <p>No orders received yet.</p>}
        </section>
      )}

      {/* ── Business Verification Tab ── */}
      {tab === 'verification' && (
        <section>
          <BusinessVerificationView token={token} me={me} onUpdateMe={onUpdateMe} />
        </section>
      )}

      {/* ── Dedicated Profile Tab ── */}
      {tab === 'profile' && (
        <ProfileTab me={me} token={token} onUpdateMe={onUpdateMe} />
      )}

      {/* ── Order Receipt Modal ── */}
      {receiptOrderId && (
        <ReceiptModal orderId={receiptOrderId} token={token} onClose={() => setReceiptOrderId(null)} />
      )}

      {/* ── Add Product Modal (with Comprehensive Predefined Categories) ── */}
      {addModal && (
        <Modal title="Add New Product" onClose={() => setAddModal(false)}>
          <p className="muted-text" style={{ margin: '0 0 16px' }}>
            Adding to store: <strong>{officialShopName}</strong>
          </p>
          <form onSubmit={handleAddProduct}>
            <label className="form-label">Product Name <span className="req">*</span>
              <input type="text" value={formData.productName}
                onChange={e => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g. Pork Belly (per kg) or Fresh Tilapia" required />
            </label>

            {/* EXPANDED CATEGORIES DROPDOWN */}
            <label className="form-label">Supply Category <span className="req">*</span>
              <select value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })} required>
                <option value="">— Select predefined food category —</option>
                {categories.map(c => (
                  <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>
                ))}
              </select>
              <span className="field-hint">Predefined categories covering Meat, Seafood, Vegetables, Fruits, Dairy, Dry Goods, Beverages, Frozen Foods, Packaging &amp; Supplies.</span>
            </label>

            <label className="form-label">Price per Unit (₱) <span className="req">*</span>
              <input type="number" min="0" step="0.01" value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00" required />
            </label>

            <label className="form-label">Available Stock Quantity <span className="req">*</span>
              <input type="number" min="0" step="1" value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0" required />
            </label>

            {addError && <div className="error">{addError}</div>}
            <button type="submit" className="submit-btn" disabled={addBusy} style={{ marginTop: 12 }}>
              {addBusy ? 'Saving Product…' : <><Plus size={16} /> Add Product to Catalog</>}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Update Delivery Modal ── */}
      {deliveryModal && (
        <Modal title={`Update Delivery — Order #${deliveryModal.OrderID}`} onClose={() => setDeliveryModal(null)}>
          <p className="muted-text">Shipping to: <strong>{deliveryModal.BusinessName}</strong>
            {deliveryModal.StallNumber && ` (Stall ${deliveryModal.StallNumber})`}</p>
          <form onSubmit={handleDeliveryUpdate}>
            <label className="form-label">Delivery Status
              <select value={delStatus} onChange={e => setDelStatus(e.target.value)} required>
                <option value="Scheduled">Scheduled</option>
                <option value="InTransit">In Transit</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Failed">Failed</option>
                <option value="Delivered">Delivered</option>
              </select>
            </label>
            <label className="form-label">Scheduled / Updated Delivery Date &amp; Time
              <input type="datetime-local" value={delDate}
                onChange={e => setDelDate(e.target.value)} />
            </label>
            {delError && <div className="error">{delError}</div>}
            <button type="submit" className="submit-btn" disabled={delBusy} style={{ marginTop: 12 }}>
              {delBusy ? 'Saving…' : <><Truck size={16} /> Save Delivery Status</>}
            </button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}

/* ══════════════════ ADMIN APP ════════════════════════════════════════ */
function AdminApp({ token, me, onLogout, onUpdateMe }) {
  const [tab,      setTab]      = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [tenants,  setTenants]  = useState([]);
  const [pendingVerifs, setPendingVerifs] = useState(0);
  const [receiptOrderId, setReceiptOrderId] = useState(null);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // Shop detail modal
  const [selectedShop, setSelectedShop]   = useState(null);
  const [shopDetail,   setShopDetail]     = useState(null);
  const [loadingShop,  setLoadingShop]    = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [p, o, t, v] = await Promise.all([
        request('/products', token),
        request('/orders',   token),
        request('/tenants',  token),
        request('/verification/admin/list?status=Pending%20Verification', token).catch(() => []),
      ]);
      setProducts(p); setOrders(o); setTenants(t);
      setPendingVerifs(Array.isArray(v) ? v.length : 0);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openShop = async (shop) => {
    setSelectedShop(shop);
    setLoadingShop(true);
    try {
      const d = await request(`/tenants/${shop.TenantID}`, token);
      setShopDetail(d);
    } catch (e) { setError(e.message); }
    finally { setLoadingShop(false); }
  };

  const TABS = [
    ['dashboard',     LayoutDashboard, 'Overview'],
    ['verifications', ShieldCheck,     pendingVerifs > 0 ? `Verifications (${pendingVerifs})` : 'Verifications'],
    ['products',      Package,         'All Products'],
    ['orders',        ClipboardList,   'All Orders'],
    ['shops',         Store,           'All Shops'],
    ['profile',       User,            'Profile Settings'],
  ];

  return (
    <Shell me={me} onLogout={onLogout} onRefresh={load} busy={busy}
      tabs={TABS} activeTab={tab} setTab={setTab}>
      {error && <div className="error">{error}</div>}

      {tab === 'dashboard' && (
        <>
          {pendingVerifs > 0 && (
            <div className="verification-banner" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', marginBottom: 16 }}>
              <AlertTriangle size={20} color="#d97706" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 2px 0', color: '#92400e' }}>Action Required: {pendingVerifs} Pending Verification{pendingVerifs > 1 ? 's' : ''}</h4>
                <p style={{ margin: 0, fontSize: 13, color: '#78350f' }}>Review submitted business permits and legitimacy documents to activate merchant accounts.</p>
              </div>
              <button type="button" className="receipt-pill-btn" onClick={() => setTab('verifications')} style={{ background: '#0284c7', color: '#fff', borderColor: '#0284c7' }}>
                Review Now
              </button>
            </div>
          )}

          <div className="metrics">
            <article><span>Total products</span><strong>{products.length}</strong></article>
            <article><span>Total orders</span><strong>{orders.length}</strong></article>
            <article><span>Registered shops</span><strong>{tenants.length}</strong></article>
            <article onClick={() => setTab('verifications')} style={{ cursor: 'pointer', borderLeft: pendingVerifs > 0 ? '4px solid #f59e0b' : undefined }}>
              <span>Pending Verifications</span>
              <strong style={{ color: pendingVerifs > 0 ? '#b45309' : 'inherit' }}>{pendingVerifs}</strong>
            </article>
          </div>
          <section><h2>Admin overview</h2><p>Full visibility across all network data.</p></section>
        </>
      )}

      {tab === 'verifications' && (
        <AdminVerificationsView token={token} onRefreshOverview={load} />
      )}

      {tab === 'products' && (
        <section>
          <h2>All Products</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Supplier</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.ProductID}>
                    <td><strong>{p.ProductName}</strong></td><td><span className="category-tag">{p.CategoryName}</span></td><td>{p.SupplierName}</td>
                    <td>{fmt(p.Price)}</td>
                    <td><span className={p.Stock <= 10 ? 'low-stock' : ''}>{p.Stock} units</span></td>
                    <td><StatusBadge value={p.IsActive ? 'Active' : 'Inactive'}
                      map={{ Active: { cls: 'badge-active' }, Inactive: { cls: 'badge-inactive' } }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <section>
          <h2>All Orders</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order #</th><th>Date</th><th>Business</th><th>Supplier</th><th>Status</th><th>Payment</th><th>Total</th><th>Receipt</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.OrderID}>
                    <td>#{o.OrderID}</td>
                    <td>{new Date(o.OrderDate).toLocaleDateString('en-PH')}</td>
                    <td>{o.BusinessName}</td>
                    <td>{o.SupplierName}</td>
                    <td><StatusBadge value={o.Status} map={ORDER_STATUS_MAP} /></td>
                    <td>{o.PaymentStatus
                      ? <StatusBadge value={o.PaymentStatus} map={PAYMENT_STATUS_MAP} />
                      : <span className="muted">—</span>}</td>
                    <td>{fmt(o.TotalAmount)}</td>
                    <td>
                      <button type="button" className="receipt-pill-btn" onClick={() => setReceiptOrderId(o.OrderID)} title="View & Print Order Receipt">
                        <Printer size={13} /> {o.ReceiptNumber || 'Receipt'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'shops' && (
        <section>
          <h2>All Shops</h2>
          <p>Click a shop to view its details and order history.</p>
          <div className="shop-grid">
            {tenants.map(t => (
              <div key={t.TenantID} className="shop-card shop-card-clickable" onClick={() => openShop(t)}>
                <div className="shop-card-header">
                  <Store size={20} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong>{t.BusinessName}</strong>
                    <VerifiedBadge status={t.VerificationStatus} />
                  </div>
                </div>
                {t.BusinessType && <div className="shop-detail"><Building size={13} /><span>{t.BusinessType}</span></div>}
                {t.StallNumber && <div className="shop-detail"><Hash size={13} /><span>Stall {t.StallNumber}</span></div>}
                {t.ContactNo   && <div className="shop-detail"><Phone size={13} /><span>{t.ContactNo}</span></div>}
                {t.Address     && <div className="shop-detail"><MapPin size={13} /><span>{t.Address}</span></div>}
                <div className="shop-cta">View Details <ChevronRight size={14} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Dedicated Profile Tab ── */}
      {tab === 'profile' && (
        <ProfileTab me={me} token={token} onUpdateMe={onUpdateMe} />
      )}

      {/* ── Shop Detail Modal ── */}
      {selectedShop && (
        <Modal title={selectedShop.BusinessName} onClose={() => { setSelectedShop(null); setShopDetail(null); }} wide>
          {loadingShop && <div className="loading-spinner"><RefreshCw size={24} className="spinning" /></div>}
          {shopDetail && (
            <>
              <div className="supplier-meta">
                <div style={{ marginBottom: 8 }}>
                  <VerifiedBadge status={shopDetail.VerificationStatus} />
                </div>
                {shopDetail.BusinessType && <div className="shop-detail"><Building size={13} /><span>Type: {shopDetail.BusinessType}</span></div>}
                {shopDetail.RegistrationNumber && <div className="shop-detail"><FileText size={13} /><span>Reg #: {shopDetail.RegistrationNumber}</span></div>}
                {shopDetail.StallNumber && <div className="shop-detail"><Hash size={13} /><span>Stall {shopDetail.StallNumber}</span></div>}
                {shopDetail.ContactNo   && <div className="shop-detail"><Phone size={13} /><span>{shopDetail.ContactNo}</span></div>}
                {shopDetail.Address     && <div className="shop-detail"><MapPin size={13} /><span>{shopDetail.Address}</span></div>}
              </div>

              <h3 style={{ margin: '18px 0 8px' }}>Users</h3>
              {shopDetail.users.length === 0 && <p className="muted-text">No users linked.</p>}
              <ul style={{ paddingLeft: 18, color: '#60716a', fontSize: 13 }}>
                {shopDetail.users.map(u => (
                  <li key={u.UserID}>{u.Name} — {u.Email}{u.ContactNo ? ` · ${u.ContactNo}` : ''}</li>
                ))}
              </ul>

              <h3 style={{ margin: '18px 0 8px' }}>Recent Orders</h3>
              {shopDetail.orders.length === 0 && <p className="muted-text">No orders yet.</p>}
              {shopDetail.orders.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Order #</th><th>Date</th><th>Supplier</th><th>Status</th><th>Payment</th><th>Total</th><th>Receipt</th></tr></thead>
                    <tbody>
                      {shopDetail.orders.map(o => (
                        <tr key={o.OrderID}>
                          <td>#{o.OrderID}</td>
                          <td>{new Date(o.OrderDate).toLocaleDateString('en-PH')}</td>
                          <td>{o.SupplierName}</td>
                          <td><StatusBadge value={o.Status} map={ORDER_STATUS_MAP} /></td>
                          <td>{o.PaymentStatus
                            ? <StatusBadge value={o.PaymentStatus} map={PAYMENT_STATUS_MAP} />
                            : <span className="muted">—</span>}</td>
                          <td>{fmt(o.TotalAmount)}</td>
                          <td>
                            <button type="button" className="receipt-pill-btn" onClick={() => setReceiptOrderId(o.OrderID)}>
                              <Printer size={13} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* ── Order Receipt Modal ── */}
      {receiptOrderId && (
        <ReceiptModal
          orderId={receiptOrderId}
          token={token}
          onClose={() => setReceiptOrderId(null)}
        />
      )}
    </Shell>
  );
}

/* ══════════════════ ROOT APP ════════════════════════════════════════ */
function App() {
  const [token, setToken] = useState(sessionStorage.getItem(TOKEN_KEY) || '');
  const [me,    setMe]    = useState(null);
  const [error, setError] = useState('');

  const logout = useCallback((errMsg = '') => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(''); setMe(null); setError(errMsg);
  }, []);

  const loadMe = useCallback(async (authToken) => {
    try {
      const u = await request('/me', authToken);
      setMe(u);
    } catch (e) {
      logout(e.message || 'Session expired. Please sign in again.');
    }
  }, [logout]);

  useEffect(() => {
    if (!token) { setMe(null); return; }
    loadMe(token);
  }, [token, loadMe]);

  const handleToken = (newToken) => { setError(''); setMe(null); setToken(newToken); };
  const handleUpdateMe = (updatedUser) => { setMe(updatedUser); };

  if (!token) return <AuthPage onToken={handleToken} initialError={error} />;

  if (!me) return (
    <main className="login-page">
      {error
        ? <div className="error">{error}</div>
        : <div className="loading-spinner"><RefreshCw size={28} className="spinning" /><p>Loading…</p></div>
      }
    </main>
  );

  if (me.Role === 'Supplier')      return <SupplierApp      token={token} me={me} onLogout={logout} onUpdateMe={handleUpdateMe} />;
  if (me.Role === 'BusinessOwner') return <BusinessOwnerApp  token={token} me={me} onLogout={logout} onUpdateMe={handleUpdateMe} />;
  if (me.Role === 'Admin')         return <AdminApp          token={token} me={me} onLogout={logout} onUpdateMe={handleUpdateMe} />;

  return (
    <main className="login-page">
      <div className="error">Unrecognised role "{me.Role}". Please contact support.</div>
      <button onClick={logout} style={{ marginTop: 16 }}>Sign out</button>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
