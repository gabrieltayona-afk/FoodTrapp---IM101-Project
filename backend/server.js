import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// Parse comma-separated origins from FRONTEND_ORIGIN (e.g. "https://app.vercel.app,http://localhost:5173")
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, uptime monitors)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key} in backend/.env`);
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');

// MySQL SSL Configuration:
// Accepts CA certificate directly from DB_CA_CERT (PEM text in environment variable)
// or falls back to DB_CA_PATH (file path for local development).
let sslConfig = false;
if (process.env.DB_CA_CERT) {
  const certText = process.env.DB_CA_CERT.includes('\\n')
    ? process.env.DB_CA_CERT.replace(/\\n/g, '\n')
    : process.env.DB_CA_CERT;
  sslConfig = { ca: certText, rejectUnauthorized: true };
} else if (process.env.DB_CA_PATH && fs.existsSync(process.env.DB_CA_PATH)) {
  sslConfig = { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME, ssl: sslConfig,
  waitForConnections: true, connectionLimit: 5, decimalNumbers: true,
});

/* ── Email Delivery Service ────────────────────────────────────────── */
function getMailer() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '').trim();
  if (!user || !pass) {
    return null;
  }

  // Use Gmail service preset if user is @gmail.com or SMTP_HOST is smtp.gmail.com
  if (user.endsWith('@gmail.com') || process.env.SMTP_HOST?.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  const host = process.env.SMTP_HOST?.trim() || 'localhost';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, text, html }) {
  const mailer = getMailer();
  if (!mailer) {
    console.warn(`[MAILER WARNING] Cannot dispatch email to ${to}: SMTP_USER or SMTP_PASS is not configured in backend/.env`);
    return { sent: false, error: 'SMTP credentials not configured in backend/.env' };
  }

  const from = process.env.EMAIL_FROM?.trim() || `"Food Supply Network" <${process.env.SMTP_USER.trim()}>`;
  try {
    const info = await mailer.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[MAILER SUCCESS] Email sent to ${to}: messageId=${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/* ── Auth helpers ──────────────────────────────────────────────────── */
function tokenFor(user) {
  return jwt.sign({ id: user.UserID }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.execute(`
      SELECT u.UserID, u.Name, u.Email, u.ContactNo, u.Role, u.TenantID, u.SupplierID,
             s.SupplierName, s.Address AS SupplierAddress, s.Description AS SupplierDescription, s.ContactNo AS SupplierContactNo,
             s.VerificationStatus AS SupplierVerificationStatus, s.BusinessType AS SupplierBusinessType,
             s.RegistrationNumber AS SupplierRegNo, s.TaxIdNumber AS SupplierTaxId,
             t.BusinessName, t.StallNumber, t.Address AS TenantAddress, t.Description AS TenantDescription, t.ContactNo AS TenantContactNo,
             t.VerificationStatus AS TenantVerificationStatus, t.BusinessType AS TenantBusinessType,
             t.RegistrationNumber AS TenantRegNo, t.TaxIdNumber AS TenantTaxId
      FROM Users u
      LEFT JOIN Supplier s ON s.SupplierID = u.SupplierID
      LEFT JOIN Tenant t ON t.TenantID = u.TenantID
      WHERE u.UserID = ? AND u.IsActive = 1
    `, [payload.id]);
    if (!rows.length) return res.status(401).json({ error: 'Account inactive or missing' });

    const user = rows[0];
    if (user.Role === 'Supplier') {
      user.ShopName = user.SupplierName || '';
      user.Address = user.SupplierAddress || '';
      user.Description = user.SupplierDescription || '';
      user.ContactNo = user.ContactNo || user.SupplierContactNo || '';
      user.VerificationStatus = user.SupplierVerificationStatus || 'Pending Verification';
      user.BusinessType = user.SupplierBusinessType || 'Sole Proprietorship';
      user.RegistrationNumber = user.SupplierRegNo || '';
      user.TaxIdNumber = user.SupplierTaxId || '';
    } else if (user.Role === 'BusinessOwner') {
      user.ShopName = user.BusinessName || '';
      user.Address = user.TenantAddress || '';
      user.Description = user.TenantDescription || '';
      user.ContactNo = user.ContactNo || user.TenantContactNo || '';
      user.VerificationStatus = user.TenantVerificationStatus || 'Pending Verification';
      user.BusinessType = user.TenantBusinessType || 'Sole Proprietorship';
      user.RegistrationNumber = user.TenantRegNo || '';
      user.TaxIdNumber = user.TenantTaxId || '';
    } else {
      user.VerificationStatus = 'Verified';
      user.ShopName = 'System Administration';
      user.Address = 'Tagbilaran City, Bohol';
      user.Description = 'Platform Administrator';
      user.BusinessType = 'Platform Operator';
      user.RegistrationNumber = 'ADMIN-001';
      user.TaxIdNumber = 'N/A';
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name !== 'JsonWebTokenError' && err.name !== 'TokenExpiredError') {
      console.error('[AUTH ERROR]', err);
    }
    return res.status(401).json({ error: 'Please sign in again' });
  }
}

/* ── Health (root & API) ───────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req, res, next) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'connected' }); } catch (e) { next(e); }
});

/* ── Login ─────────────────────────────────────────────────────────── */
app.post('/api/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string'
      || email.length > 150 || password.length > 200)
      return res.status(400).json({ error: 'Enter a valid email and password' });

    const [rows] = await pool.execute(
      'SELECT UserID, Email, PasswordHash, IsActive FROM Users WHERE Email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or account not configured' });
    }

    // Check if account has not yet completed email verification
    if (!user.IsActive) {
      return res.status(403).json({
        error: 'Your email address has not been verified yet. Please enter the 6-digit verification code sent to your email to activate your account.',
        requiresVerification: true,
        email: user.Email
      });
    }

    if (!user.PasswordHash.startsWith('$2') || !(await bcrypt.compare(password, user.PasswordHash))) {
      return res.status(401).json({ error: 'Invalid credentials or account not configured' });
    }

    res.json({ token: tokenFor(user) });
  } catch (e) { next(e); }
});

/* ── Register (with Mandatory Contact & 6-digit Email Verification) ── */
app.post('/api/register', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, email, password, confirmPassword, role, contactNo,
      businessName, stallNumber, address, businessType, registrationNumber, taxIdNumber } = req.body || {};

    // ── Validate mandatory common fields ─────────────────────────────
    const fieldErrors = {};

    if (typeof name !== 'string' || name.trim().length < 2) {
      fieldErrors.name = 'Full name must be at least 2 characters.';
    } else if (name.trim().length > 100) {
      fieldErrors.name = 'Full name cannot exceed 100 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
      fieldErrors.email = 'Enter a valid email address (e.g. user@example.com).';
    }

    const cleanPhone = (typeof contactNo === 'string' ? contactNo.trim() : '');
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15 || !/^[0-9+\-\s()]+$/.test(cleanPhone)) {
      fieldErrors.contactNo = 'Contact number is required (min 7 digits, e.g. 0917-123-4567).';
    }

    // Strong password validation: min 8, uppercase, lowercase, number, special char
    const hasUpper = /[A-Z]/.test(password || '');
    const hasLower = /[a-z]/.test(password || '');
    const hasNumber = /[0-9]/.test(password || '');
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password || '');
    const isLongEnough = typeof password === 'string' && password.length >= 8;

    if (!isLongEnough || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      fieldErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }

    const allowedRoles = ['BusinessOwner', 'Supplier'];
    if (!allowedRoles.includes(role)) {
      fieldErrors.role = 'Please select a valid account type.';
    }

    if (typeof businessName !== 'string' || businessName.trim().length < 2) {
      fieldErrors.businessName = (role === 'BusinessOwner' ? 'Business name' : 'Shop / supplier name') + ' must be at least 2 characters.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      // Pick first error for top-level message
      const firstError = Object.values(fieldErrors)[0];
      return res.status(400).json({ error: firstError, fieldErrors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── Check email uniqueness ──────────────────────────────────────
    const [existing] = await conn.execute(
      'SELECT UserID, IsActive, TenantID, SupplierID FROM Users WHERE Email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existing.length) {
      if (existing[0].IsActive) {
        return res.status(400).json({
          error: 'An account with that email already exists.',
          fieldErrors: { email: 'This email is already registered. Please sign in or use a different email.' }
        });
      }
      // If user registered earlier but never verified, clean up old pending row
      const oldUser = existing[0];
      await conn.execute('DELETE FROM Users WHERE UserID = ?', [oldUser.UserID]);
      if (oldUser.TenantID) {
        await conn.execute('DELETE FROM Tenant WHERE TenantID = ?', [oldUser.TenantID]);
      }
      if (oldUser.SupplierID) {
        await conn.execute('DELETE FROM Supplier WHERE SupplierID = ?', [oldUser.SupplierID]);
      }
    }

    const hash = await bcrypt.hash(password, 12);
    let tenantId = null;
    let supplierId = null;

    if (role === 'BusinessOwner') {
      const [tenantResult] = await conn.execute(
        'INSERT INTO Tenant (BusinessName, StallNumber, ContactNo, Address, VerificationStatus, BusinessType, RegistrationNumber, TaxIdNumber) VALUES (?, ?, ?, ?, "Pending Verification", ?, ?, ?)',
        [businessName.trim(), stallNumber?.trim() || null, cleanPhone, address?.trim() || null, businessType?.trim() || null, registrationNumber?.trim() || null, taxIdNumber?.trim() || null]
      );
      tenantId = tenantResult.insertId;
    } else if (role === 'Supplier') {
      const [supplierResult] = await conn.execute(
        'INSERT INTO Supplier (SupplierName, ContactNo, Address, VerificationStatus, BusinessType, RegistrationNumber, TaxIdNumber) VALUES (?, ?, ?, "Pending Verification", ?, ?, ?)',
        [businessName.trim(), cleanPhone, address?.trim() || null, businessType?.trim() || null, registrationNumber?.trim() || null, taxIdNumber?.trim() || null]
      );
      supplierId = supplierResult.insertId;
    }

    // Insert user as IsActive = 0 until 6-digit code is verified
    await conn.execute(
      'INSERT INTO Users (Name, Email, PasswordHash, ContactNo, Role, TenantID, SupplierID, IsActive) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [name.trim(), normalizedEmail, hash, contactNo.trim(), role, tenantId, supplierId]
    );

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await conn.execute(
      'INSERT INTO EmailVerification (Email, Code, ExpiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [normalizedEmail, verificationCode]
    );

    await conn.commit();

    console.log(`[EMAIL VERIFICATION] Generated 6-digit code for ${normalizedEmail}: ${verificationCode}`);

    // Dispatch verification email via Nodemailer
    await sendEmail({
      to: normalizedEmail,
      subject: `Your Verification Code: ${verificationCode} - Food Supply Network`,
      text: `Hello,\n\nYour 6-digit email verification code is: ${verificationCode}\n\nThis code will expire in 15 minutes.\n\nFood Supply Network`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e8e3; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #16774d; margin: 0; font-size: 22px;">Food Supply Network</h2>
            <p style="color: #60716a; font-size: 14px; margin: 4px 0 0;">Email Verification</p>
          </div>
          <p style="font-size: 15px; color: #172d27;">Hello,</p>
          <p style="font-size: 14px; color: #3d5249; line-height: 1.5;">
            Thank you for registering with the Food Supply Network. Please enter the following 6-digit verification code to activate your account:
          </p>
          <div style="text-align: center; margin: 26px 0;">
            <div style="display: inline-block; background-color: #e7f5ed; border: 2px dashed #16774d; border-radius: 8px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16774d; font-family: monospace;">
              ${verificationCode}
            </div>
          </div>
          <p style="font-size: 13px; color: #718078; line-height: 1.5;">
            This code will expire in <strong>15 minutes</strong>. If you did not create this account, you can disregard this email.
          </p>
          <hr style="border: none; border-top: 1px solid #edf0ed; margin: 24px 0;" />
          <p style="font-size: 11px; color: #a0aba5; text-align: center; margin: 0;">
            Food Supply Network · Bohol Marketplace Logistics
          </p>
        </div>
      `,
    });

    res.status(201).json({
      status: 'verification_required',
      email: normalizedEmail,
      message: 'Account registered! A 6-digit verification code has been sent to your email address.',
    });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(e);
  } finally {
    conn.release();
  }
});

/* ── Verify 6-digit Email Code ──────────────────────────────────────── */
app.post('/api/verify-code', async (req, res, next) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code || String(code).trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a valid 6-digit verification code.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = String(code).trim();

    const [rows] = await pool.execute(`
      SELECT VerificationID, Code, ExpiresAt, UsedAt
      FROM EmailVerification
      WHERE Email = ? AND Code = ? AND UsedAt IS NULL
      ORDER BY VerificationID DESC LIMIT 1
    `, [normalizedEmail, normalizedCode]);

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    const rec = rows[0];
    if (new Date(rec.ExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This verification code has expired. Please request a new code.' });
    }

    // Mark code as used and activate user account
    await pool.execute('UPDATE EmailVerification SET UsedAt = NOW() WHERE VerificationID = ?', [rec.VerificationID]);
    await pool.execute('UPDATE Users SET IsActive = 1 WHERE Email = ?', [normalizedEmail]);

    console.log(`[EMAIL VERIFICATION] Successfully verified account for ${normalizedEmail}`);

    res.json({
      success: true,
      message: 'Account successfully created and verified! You can now log in.'
    });
  } catch (e) { next(e); }
});

/* ── Resend 6-digit Verification Code ──────────────────────────────── */
app.post('/api/resend-code', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [users] = await pool.execute(
      'SELECT UserID, IsActive FROM Users WHERE Email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'No pending account found with that email.' });
    }

    if (users[0].IsActive) {
      return res.status(400).json({ error: 'This account is already verified and active. You can log in directly.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.execute(
      'INSERT INTO EmailVerification (Email, Code, ExpiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [normalizedEmail, verificationCode]
    );

    console.log(`[EMAIL RESEND] New verification code for ${normalizedEmail}: ${verificationCode}`);

    // Dispatch new verification email
    await sendEmail({
      to: normalizedEmail,
      subject: `Your New Verification Code: ${verificationCode} - Food Supply Network`,
      text: `Hello,\n\nYour new 6-digit email verification code is: ${verificationCode}\n\nThis code will expire in 15 minutes.\n\nFood Supply Network`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e8e3; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #16774d; margin: 0; font-size: 22px;">Food Supply Network</h2>
            <p style="color: #60716a; font-size: 14px; margin: 4px 0 0;">Email Verification</p>
          </div>
          <p style="font-size: 15px; color: #172d27;">Hello,</p>
          <p style="font-size: 14px; color: #3d5249; line-height: 1.5;">
            Here is your new 6-digit verification code to activate your account:
          </p>
          <div style="text-align: center; margin: 26px 0;">
            <div style="display: inline-block; background-color: #e7f5ed; border: 2px dashed #16774d; border-radius: 8px; padding: 14px 28px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16774d; font-family: monospace;">
              ${verificationCode}
            </div>
          </div>
          <p style="font-size: 13px; color: #718078; line-height: 1.5;">
            This code will expire in <strong>15 minutes</strong>.
          </p>
          <hr style="border: none; border-top: 1px solid #edf0ed; margin: 24px 0;" />
          <p style="font-size: 11px; color: #a0aba5; text-align: center; margin: 0;">
            Food Supply Network · Bohol Marketplace Logistics
          </p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email address.',
    });
  } catch (e) { next(e); }
});

/* ── Forgot Password (Request Reset Link) ───────────────────────────── */
app.post('/api/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid registered email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [users] = await pool.execute(
      'SELECT UserID, Name, Email, IsActive FROM Users WHERE Email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (!users.length || !users[0].IsActive) {
      // Standard security practice: generic acknowledgement to protect privacy
      return res.json({
        success: true,
        message: 'If an active account exists with that email address, a password reset link has been dispatched.'
      });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');

    await pool.execute(
      'INSERT INTO PasswordReset (UserID, Email, Token, ExpiresAt) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
      [user.UserID, normalizedEmail, resetToken]
    );

    const primaryOrigin = allowedOrigins[0] || 'http://localhost:5173';
    const resetLink = `${primaryOrigin}?reset_token=${resetToken}`;
    console.log(`[PASSWORD RESET] Generated reset link for ${normalizedEmail}: ${resetLink}`);

    // Dispatch password reset email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Reset Your Password - Food Supply Network',
      text: `Hello,\n\nWe received a request to reset your password. Use the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nFood Supply Network`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e8e3; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #16774d; margin: 0; font-size: 22px;">Food Supply Network</h2>
            <p style="color: #60716a; font-size: 14px; margin: 4px 0 0;">Password Recovery</p>
          </div>
          <p style="font-size: 15px; color: #172d27;">Hello,</p>
          <p style="font-size: 14px; color: #3d5249; line-height: 1.5;">
            We received a request to reset your password. Click the button below to define a new password for your account:
          </p>
          <div style="text-align: center; margin: 26px 0;">
            <a href="${resetLink}" style="background-color: #16774d; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 12px; color: #718078; word-break: break-all;">
            Or copy and paste this link into your browser:<br />
            <a href="${resetLink}" style="color: #16774d;">${resetLink}</a>
          </p>
          <p style="font-size: 13px; color: #718078; line-height: 1.5; margin-top: 18px;">
            This link is valid for <strong>1 hour</strong>. If you did not request a password reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #edf0ed; margin: 24px 0;" />
          <p style="font-size: 11px; color: #a0aba5; text-align: center; margin: 0;">
            Food Supply Network · Bohol Marketplace Logistics
          </p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: 'A secure, time-limited password reset link has been sent to your registered email address.',
    });
  } catch (e) { next(e); }
});

/* ── Verify Reset Token ────────────────────────────────────────────── */
app.get('/api/verify-reset-token', async (req, res, next) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Missing reset token.' });

    const [rows] = await pool.execute(
      'SELECT ResetID, Email, ExpiresAt, UsedAt FROM PasswordReset WHERE Token = ? LIMIT 1',
      [token]
    );

    if (!rows.length || rows[0].UsedAt) {
      return res.status(400).json({ error: 'This password reset link is invalid or has already been used.' });
    }

    if (new Date(rows[0].ExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
    }

    res.json({ valid: true, email: rows[0].Email });
  } catch (e) { next(e); }
});

/* ── Reset Password ────────────────────────────────────────────────── */
app.post('/api/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing reset token.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const [rows] = await pool.execute(
      'SELECT ResetID, UserID, Email, ExpiresAt, UsedAt FROM PasswordReset WHERE Token = ? LIMIT 1',
      [token.trim()]
    );

    if (!rows.length || rows[0].UsedAt) {
      return res.status(400).json({ error: 'This password reset link is invalid or has already been used.' });
    }

    const resetRec = rows[0];
    if (new Date(resetRec.ExpiresAt).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);

    await pool.execute('UPDATE Users SET PasswordHash = ? WHERE UserID = ?', [hash, resetRec.UserID]);
    await pool.execute('UPDATE PasswordReset SET UsedAt = NOW() WHERE ResetID = ?', [resetRec.ResetID]);

    console.log(`[PASSWORD RESET] Password successfully reset for UserID: ${resetRec.UserID} (${resetRec.Email})`);

    res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your updated credentials.'
    });
  } catch (e) { next(e); }
});

/* ── Me ────────────────────────────────────────────────────────────── */
app.get('/api/me', auth, (req, res) => res.json(req.user));

/* ── Update Profile & Real-Time Network Sync ───────────────────────── */
app.put('/api/profile', auth, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, contactNo, address, stallNumber, description, shopName } = req.body || {};

    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (!contactNo || typeof contactNo !== 'string' || contactNo.trim().length < 7) {
      return res.status(400).json({ error: 'A valid contact number is required.' });
    }

    const cleanName = name ? name.trim() : req.user.Name;
    const cleanContact = contactNo.trim();
    const cleanAddress = address ? address.trim() : null;
    const cleanDesc = description !== undefined ? (description ? description.trim() : null) : (req.user.Description || null);
    const cleanShopName = shopName ? shopName.trim() : req.user.ShopName;

    // Update Users table contact & name
    await conn.execute(
      'UPDATE Users SET Name = ?, ContactNo = ? WHERE UserID = ?',
      [cleanName, cleanContact, req.user.UserID]
    );

    if (req.user.Role === 'Supplier' && req.user.SupplierID) {
      await conn.execute(`
        UPDATE Supplier
        SET SupplierName = COALESCE(?, SupplierName),
            ContactNo = ?,
            Address = ?,
            Description = ?
        WHERE SupplierID = ?
      `, [cleanShopName, cleanContact, cleanAddress, cleanDesc, req.user.SupplierID]);
    } else if (req.user.Role === 'BusinessOwner' && req.user.TenantID) {
      await conn.execute(`
        UPDATE Tenant
        SET BusinessName = COALESCE(?, BusinessName),
            StallNumber = ?,
            ContactNo = ?,
            Address = ?,
            Description = ?
        WHERE TenantID = ?
      `, [cleanShopName, stallNumber?.trim() || null, cleanContact, cleanAddress, cleanDesc, req.user.TenantID]);
    }

    await conn.commit();

    // Fetch refreshed user object
    const [rows] = await pool.execute(`
      SELECT u.UserID, u.Name, u.Email, u.ContactNo, u.Role, u.TenantID, u.SupplierID,
             s.SupplierName, s.Address AS SupplierAddress, s.Description AS SupplierDescription, s.ContactNo AS SupplierContactNo,
             t.BusinessName, t.StallNumber, t.Address AS TenantAddress, t.Description AS TenantDescription, t.ContactNo AS TenantContactNo
      FROM Users u
      LEFT JOIN Supplier s ON s.SupplierID = u.SupplierID
      LEFT JOIN Tenant t ON t.TenantID = u.TenantID
      WHERE u.UserID = ?
    `, [req.user.UserID]);

    const updatedUser = rows[0];
    if (updatedUser.Role === 'Supplier') {
      updatedUser.ShopName = updatedUser.SupplierName || '';
      updatedUser.Address = updatedUser.SupplierAddress || '';
      updatedUser.Description = updatedUser.SupplierDescription || '';
      updatedUser.ContactNo = updatedUser.ContactNo || updatedUser.SupplierContactNo || '';
    } else if (updatedUser.Role === 'BusinessOwner') {
      updatedUser.ShopName = updatedUser.BusinessName || '';
      updatedUser.Address = updatedUser.TenantAddress || '';
      updatedUser.Description = updatedUser.TenantDescription || '';
      updatedUser.ContactNo = updatedUser.ContactNo || updatedUser.TenantContactNo || '';
    }

    res.json({
      success: true,
      message: 'Profile updated successfully and synced with the network directory.',
      user: updatedUser
    });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

/* ── Categories (for product form) ────────────────────────────────── */
app.get('/api/categories', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT CategoryID, CategoryName FROM Category ORDER BY CategoryName');
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Suppliers (Browse Shops — shows actual suppliers not tenants) ── */
app.get('/api/suppliers', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        s.SupplierID, s.SupplierName, s.ContactNo, s.Address, s.Description,
        s.VerificationStatus, s.BusinessType, s.RegistrationNumber,
        COUNT(DISTINCT p.ProductID) AS ProductCount,
        GROUP_CONCAT(DISTINCT c.CategoryName ORDER BY c.CategoryName SEPARATOR ', ') AS Categories
      FROM Supplier s
      LEFT JOIN Product p  ON p.SupplierID = s.SupplierID AND p.IsActive = 1
      LEFT JOIN Category c ON c.CategoryID = p.CategoryID
      WHERE s.IsActive = 1
      GROUP BY s.SupplierID
      ORDER BY s.SupplierName
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Supplier detail + products ────────────────────────────────────── */
app.get('/api/suppliers/:id', auth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[supplier]] = await pool.execute(
      'SELECT SupplierID, SupplierName, ContactNo, Address, Description, VerificationStatus, BusinessType, RegistrationNumber FROM Supplier WHERE SupplierID = ? AND IsActive = 1',
      [id]
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

    const [products] = await pool.execute(`
      SELECT p.ProductID, p.ProductName, p.Price, p.Stock, c.CategoryName
      FROM Product p
      JOIN Category c ON c.CategoryID = p.CategoryID
      WHERE p.SupplierID = ? AND p.IsActive = 1
      ORDER BY c.CategoryName, p.ProductName
    `, [id]);

    res.json({ ...supplier, products });
  } catch (e) { next(e); }
});

/* ── Products ──────────────────────────────────────────────────────── */
app.get('/api/products', auth, async (req, res, next) => {
  try {
    let sql = `
      SELECT p.ProductID, p.ProductName, p.Price, p.Stock, p.IsActive,
             c.CategoryName, s.SupplierName, s.SupplierID, s.VerificationStatus AS SupplierVerificationStatus
      FROM Product p
      JOIN Category c ON c.CategoryID = p.CategoryID
      JOIN Supplier s ON s.SupplierID = p.SupplierID`;
    const args = [];

    if (req.user.Role === 'Supplier') {
      sql += ' WHERE p.SupplierID = ?'; args.push(req.user.SupplierID);
    } else if (req.user.Role === 'BusinessOwner') {
      sql += ' WHERE p.IsActive = 1 AND s.IsActive = 1';
    }

    sql += ' ORDER BY p.ProductID DESC LIMIT 200';
    const [rows] = await pool.execute(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Add Product (Supplier only) ───────────────────────────────────── */
app.post('/api/products', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'Supplier')
      return res.status(403).json({ error: 'Only suppliers can add products.' });

    // Business legitimacy verification restriction
    if (req.user.VerificationStatus !== 'Verified') {
      return res.status(403).json({
        error: 'Business verification required. Your business legitimacy must be verified before listing products on the network.'
      });
    }

    const { productName, name, categoryId, price, stock, description } = req.body || {};
    const effectiveName = (productName || name || '').trim();

    if (!effectiveName || effectiveName.length < 2)
      return res.status(400).json({ error: 'Product name must be at least 2 characters.' });
    if (!categoryId || isNaN(Number(categoryId)))
      return res.status(400).json({ error: 'Please select a valid category.' });
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0)
      return res.status(400).json({ error: 'Price must be zero or greater.' });
    if (stock === undefined || isNaN(Number(stock)) || Number(stock) < 0)
      return res.status(400).json({ error: 'Stock quantity must be zero or greater.' });

    const [result] = await pool.execute(
      'INSERT INTO Product (SupplierID, CategoryID, ProductName, Price, Stock, IsActive) VALUES (?, ?, ?, ?, ?, 1)',
      [req.user.SupplierID, Number(categoryId), effectiveName, Number(price), Number(stock)]
    );

    const [[newProduct]] = await pool.execute(`
      SELECT p.ProductID, p.ProductName, p.Price, p.Stock, p.IsActive, c.CategoryName, s.SupplierName
      FROM Product p
      JOIN Category c ON c.CategoryID = p.CategoryID
      JOIN Supplier s ON s.SupplierID = p.SupplierID
      WHERE p.ProductID = ?
    `, [result.insertId]);

    res.status(201).json(newProduct);
  } catch (e) { next(e); }
});

/* ── Orders (list) ─────────────────────────────────────────────────── */
app.get('/api/orders', auth, async (req, res, next) => {
  try {
    let sql, args = [];

    if (req.user.Role === 'Supplier') {
      sql = `
        SELECT
          o.OrderID, o.OrderDate, o.Status, o.TotalAmount,
          t.BusinessName, t.StallNumber, t.ContactNo, t.Address, t.VerificationStatus AS TenantVerificationStatus,
          d.DeliveryID, d.ScheduledDate, d.Status AS DeliveryStatus,
          i.InvoiceID, i.PaymentStatus,
          r.ReceiptID, r.ReceiptNumber, r.ReceiptType
        FROM Orders o
        JOIN Tenant t ON t.TenantID = o.TenantID
        LEFT JOIN Delivery d ON d.OrderID = o.OrderID
        LEFT JOIN Invoice i ON i.OrderID = o.OrderID
        LEFT JOIN Receipt r ON r.OrderID = o.OrderID
        WHERE o.SupplierID = ?
        ORDER BY o.OrderDate DESC LIMIT 100`;
      args.push(req.user.SupplierID);

    } else if (req.user.Role === 'BusinessOwner') {
      sql = `
        SELECT
          o.OrderID, o.OrderDate, o.Status, o.TotalAmount,
          s.SupplierName, s.SupplierID, s.VerificationStatus AS SupplierVerificationStatus,
          d.ScheduledDate, d.Status AS DeliveryStatus,
          i.InvoiceID, i.PaymentStatus,
          r.ReceiptID, r.ReceiptNumber, r.ReceiptType
        FROM Orders o
        JOIN Supplier s ON s.SupplierID = o.SupplierID
        LEFT JOIN Delivery d ON d.OrderID = o.OrderID
        LEFT JOIN Invoice i ON i.OrderID = o.OrderID
        LEFT JOIN Receipt r ON r.OrderID = o.OrderID
        WHERE o.TenantID = ?
        ORDER BY o.OrderDate DESC LIMIT 100`;
      args.push(req.user.TenantID);

    } else {
      sql = `
        SELECT o.OrderID, o.OrderDate, o.Status, o.TotalAmount,
               t.BusinessName, s.SupplierName,
               i.PaymentStatus,
               r.ReceiptID, r.ReceiptNumber, r.ReceiptType
        FROM Orders o
        JOIN Tenant t ON t.TenantID = o.TenantID
        JOIN Supplier s ON s.SupplierID = o.SupplierID
        LEFT JOIN Invoice i ON i.OrderID = o.OrderID
        LEFT JOIN Receipt r ON r.OrderID = o.OrderID
        ORDER BY o.OrderDate DESC LIMIT 100`;
    }

    const [rows] = await pool.execute(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Order detail (with line items) ────────────────────────────────── */
app.get('/api/orders/:id', auth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);

    const [[order]] = await pool.execute(`
      SELECT
        o.OrderID, o.OrderDate, o.Status, o.TotalAmount, o.TenantID, o.SupplierID,
        t.BusinessName, t.StallNumber, t.Address AS TenantAddress, t.ContactNo AS TenantContact, t.VerificationStatus AS TenantVerificationStatus,
        s.SupplierName, s.Address AS SupplierAddress, s.ContactNo AS SupplierContact, s.VerificationStatus AS SupplierVerificationStatus,
        d.DeliveryID, d.ScheduledDate, d.Status AS DeliveryStatus,
        i.InvoiceID, i.PaymentStatus, i.InvoiceDate, i.Amount AS InvoiceAmount,
        r.ReceiptID, r.ReceiptNumber, r.ReceiptType
      FROM Orders o
      JOIN Tenant t ON t.TenantID = o.TenantID
      JOIN Supplier s ON s.SupplierID = o.SupplierID
      LEFT JOIN Delivery d ON d.OrderID = o.OrderID
      LEFT JOIN Invoice i ON i.OrderID = o.OrderID
      LEFT JOIN Receipt r ON r.OrderID = o.OrderID
      WHERE o.OrderID = ?
    `, [orderId]);

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Enforce tenant isolation
    if (req.user.Role === 'BusinessOwner' && order.TenantID !== req.user.TenantID)
      return res.status(403).json({ error: 'Access denied.' });
    if (req.user.Role === 'Supplier' && order.SupplierID !== req.user.SupplierID)
      return res.status(403).json({ error: 'Access denied.' });

    const [items] = await pool.execute(`
      SELECT od.OrderDetailID, od.Quantity, od.Price,
             p.ProductID, p.ProductName, c.CategoryName
      FROM OrderDetail od
      JOIN Product p ON p.ProductID = od.ProductID
      JOIN Category c ON c.CategoryID = p.CategoryID
      WHERE od.OrderID = ?
    `, [orderId]);

    res.json({ ...order, items });
  } catch (e) { next(e); }
});

/* ── Get Order Receipt (printable & download) ──────────────────────── */
app.get('/api/orders/:id/receipt', auth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);

    const [[order]] = await pool.execute(`
      SELECT
        o.OrderID, o.OrderDate, o.Status AS OrderStatus, o.TotalAmount, o.TenantID, o.SupplierID,
        t.BusinessName AS TenantBusinessName, t.StallNumber AS TenantStallNumber,
        t.Address AS TenantAddress, t.ContactNo AS TenantContact, t.VerificationStatus AS TenantVerificationStatus,
        s.SupplierName, s.Address AS SupplierAddress, s.ContactNo AS SupplierContact,
        s.Description AS SupplierDescription, s.VerificationStatus AS SupplierVerificationStatus,
        u.Name AS CustomerName, u.Email AS CustomerEmail,
        d.DeliveryID, d.ScheduledDate, d.Status AS DeliveryStatus,
        i.InvoiceID, COALESCE(r.PaymentStatus, i.PaymentStatus, 'Unpaid') AS PaymentStatus, i.InvoiceDate,
        r.ReceiptID, r.ReceiptNumber, r.ReceiptType, r.ReceiptDate, r.PaidAt,
        r.Subtotal, r.DeliveryFee, r.Discount, r.PaymentMethod,
        r.PaymentReference, r.Notes AS ReceiptNotes
      FROM Orders o
      JOIN Tenant t ON t.TenantID = o.TenantID
      JOIN Supplier s ON s.SupplierID = o.SupplierID
      LEFT JOIN Users u ON u.UserID = o.UserID
      LEFT JOIN Delivery d ON d.OrderID = o.OrderID
      LEFT JOIN Invoice i ON i.OrderID = o.OrderID
      LEFT JOIN Receipt r ON r.OrderID = o.OrderID
      WHERE o.OrderID = ?
    `, [orderId]);

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Enforce tenant isolation and role permissions
    if (req.user.Role === 'BusinessOwner' && order.TenantID !== req.user.TenantID)
      return res.status(403).json({ error: 'Access denied. You cannot view receipts for orders placed by another business.' });
    if (req.user.Role === 'Supplier' && order.SupplierID !== req.user.SupplierID)
      return res.status(403).json({ error: 'Access denied. You cannot view receipts for orders belonging to another supplier.' });

    // Fetch line items
    const [items] = await pool.execute(`
      SELECT od.OrderDetailID, od.Quantity, od.Price, (od.Quantity * od.Price) AS LineTotal,
             p.ProductID, p.ProductName, c.CategoryName
      FROM OrderDetail od
      JOIN Product p ON p.ProductID = od.ProductID
      JOIN Category c ON c.CategoryID = p.CategoryID
      WHERE od.OrderID = ?
    `, [orderId]);

    // Backfill receipt record if none existed
    let receiptNumber = order.ReceiptNumber;
    let receiptType = order.ReceiptType || (order.PaymentStatus === 'Paid' ? 'Payment Receipt' : 'Order Receipt');
    if (!receiptNumber) {
      receiptNumber = 'RCP-' + new Date(order.OrderDate).toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(orderId).padStart(4, '0');
      await pool.execute(`
        INSERT INTO Receipt (ReceiptNumber, OrderID, TenantID, SupplierID, ReceiptType, TotalAmount, Subtotal, PaymentStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE ReceiptNumber = VALUES(ReceiptNumber)
      `, [receiptNumber, orderId, order.TenantID, order.SupplierID, receiptType, order.TotalAmount, order.TotalAmount, order.PaymentStatus || 'Unpaid']);
    }

    const receiptData = {
      receiptNumber,
      receiptType,
      receiptDate: order.ReceiptDate || order.OrderDate,
      orderId: order.OrderID,
      orderDate: order.OrderDate,
      orderStatus: order.OrderStatus,
      subtotal: Number(order.Subtotal || order.TotalAmount),
      deliveryFee: Number(order.DeliveryFee || 0),
      discount: Number(order.Discount || 0),
      discountAmount: Number(order.Discount || 0),
      totalAmount: Number(order.TotalAmount),
      paymentMethod: order.PaymentMethod || (order.PaymentStatus === 'Paid' ? 'Verified Payment' : 'Pending Payment'),
      paymentStatus: order.PaymentStatus || 'Unpaid',
      paymentReference: order.PaymentReference || null,
      paidAt: order.PaidAt || null,
      notes: order.ReceiptNotes || 'Electronic order confirmation from Food Supply Network.',
      delivery: {
        status: order.DeliveryStatus || 'Scheduled',
        scheduledDate: order.ScheduledDate || null
      },
      supplier: {
        id: order.SupplierID,
        name: order.SupplierName,
        SupplierName: order.SupplierName,
        address: order.SupplierAddress || 'Tagbilaran City, Bohol',
        contact: order.SupplierContact || '—',
        description: order.SupplierDescription || '',
        isVerified: order.SupplierVerificationStatus === 'Verified'
      },
      customer: {
        tenantId: order.TenantID,
        businessName: order.TenantBusinessName,
        BusinessName: order.TenantBusinessName,
        stallNumber: order.TenantStallNumber || null,
        address: order.TenantAddress || 'Bohol Market',
        contact: order.TenantContact || '—',
        contactPerson: order.CustomerName || 'Business Owner',
        email: order.CustomerEmail || '—',
        isVerified: order.TenantVerificationStatus === 'Verified'
      },
      tenant: {
        tenantId: order.TenantID,
        businessName: order.TenantBusinessName,
        BusinessName: order.TenantBusinessName,
        stallNumber: order.TenantStallNumber || null,
        address: order.TenantAddress || 'Bohol Market',
        contact: order.TenantContact || '—',
        isVerified: order.TenantVerificationStatus === 'Verified'
      },
      items: items.map(item => ({
        id: item.OrderDetailID,
        productId: item.ProductID,
        name: item.ProductName,
        productName: item.ProductName,
        category: item.CategoryName,
        quantity: Number(item.Quantity),
        unitPrice: Number(item.Price),
        lineTotal: Number(item.LineTotal)
      })),

      // PascalCase aliases for API consistency
      ReceiptNumber: receiptNumber,
      ReceiptType: receiptType,
      ReceiptDate: order.ReceiptDate || order.OrderDate,
      OrderID: order.OrderID,
      OrderDate: order.OrderDate,
      OrderStatus: order.OrderStatus,
      Subtotal: Number(order.Subtotal || order.TotalAmount),
      DeliveryFee: Number(order.DeliveryFee || 0),
      DiscountAmount: Number(order.Discount || 0),
      TotalAmount: Number(order.TotalAmount),
      PaymentMethod: order.PaymentMethod || (order.PaymentStatus === 'Paid' ? 'Verified Payment' : 'Pending Payment'),
      PaymentStatus: order.PaymentStatus || 'Unpaid',
      PaymentReference: order.PaymentReference || null,
      PaidAt: order.PaidAt || null
    };

    res.json(receiptData);
  } catch (e) { next(e); }
});

/* ── Place order (cart checkout) ───────────────────────────────────── */
/*
 * Accepts an array of { productId, quantity } items.
 * Groups them by supplier; creates one order per supplier.
 * Creates an Invoice (Unpaid) and a Receipt for each order.
 */
app.post('/api/orders', auth, async (req, res, next) => {
  if (req.user.Role !== 'BusinessOwner')
    return res.status(403).json({ error: 'Only business owners can place orders.' });

  // Verification restriction for business owner
  if (req.user.VerificationStatus !== 'Verified') {
    return res.status(403).json({
      error: 'Business verification required. Your business legitimacy must be verified before placing orders on the platform.'
    });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate & fetch all products with lock
    const ids = items.map(i => i.productId);
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await conn.execute(`
      SELECT p.ProductID, p.SupplierID, p.Price, p.Stock, p.IsActive, s.IsActive AS SupplierActive, s.VerificationStatus AS SupplierVerification
      FROM Product p
      JOIN Supplier s ON s.SupplierID = p.SupplierID
      WHERE p.ProductID IN (${placeholders})
      FOR UPDATE
    `, ids);

    const productMap = Object.fromEntries(products.map(p => [p.ProductID, p]));

    // Validate each item
    for (const item of items) {
      const p = productMap[item.productId];
      if (!p || !p.IsActive || !p.SupplierActive)
        return res.status(400).json({ error: `Product ID ${item.productId} is unavailable.` });
      if (p.SupplierVerification !== 'Verified')
        return res.status(400).json({ error: `The supplier for product ID ${item.productId} is not yet verified to accept orders.` });
      if (!Number.isInteger(item.quantity) || item.quantity <= 0)
        return res.status(400).json({ error: `Invalid quantity for product ID ${item.productId}.` });
      if (p.Stock < item.quantity)
        return res.status(400).json({ error: `Not enough stock for product ID ${item.productId}.` });
    }

    // Group by supplier
    const bySupplier = {};
    for (const item of items) {
      const p = productMap[item.productId];
      if (!bySupplier[p.SupplierID]) bySupplier[p.SupplierID] = [];
      bySupplier[p.SupplierID].push({ ...item, price: p.Price });
    }

    const createdOrders = [];

    for (const [supplierId, supplierItems] of Object.entries(bySupplier)) {
      const total = supplierItems.reduce((s, i) => s + i.price * i.quantity, 0);

      const [orderResult] = await conn.execute(
        'INSERT INTO Orders (TenantID, SupplierID, UserID, TotalAmount) VALUES (?, ?, ?, ?)',
        [req.user.TenantID, supplierId, req.user.UserID, total]
      );
      const orderId = orderResult.insertId;

      for (const item of supplierItems) {
        await conn.execute(
          'INSERT INTO OrderDetail (OrderID, ProductID, Quantity, Price) VALUES (?, ?, ?, ?)',
          [orderId, item.productId, item.quantity, item.price]
        );
        await conn.execute(
          'UPDATE Product SET Stock = Stock - ? WHERE ProductID = ?',
          [item.quantity, item.productId]
        );
      }

      // Create invoice immediately as Unpaid
      await conn.execute(
        'INSERT INTO Invoice (OrderID, Amount, PaymentStatus) VALUES (?, ?, ?)',
        [orderId, total, 'Unpaid']
      );

      // Create initial Order Receipt immediately
      const receiptNumber = 'RCP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(orderId).padStart(4, '0');
      await conn.execute(`
        INSERT INTO Receipt
          (ReceiptNumber, OrderID, TenantID, SupplierID, ReceiptType, TotalAmount, Subtotal, DeliveryFee, Discount, PaymentMethod, PaymentStatus, Notes)
        VALUES
          (?, ?, ?, ?, 'Order Receipt', ?, ?, 0.00, 0.00, 'Pending', 'Unpaid', 'Electronic order confirmation generated at checkout.')
      `, [receiptNumber, orderId, req.user.TenantID, supplierId, total, total]);

      createdOrders.push({ orderId, receiptNumber, supplierId: Number(supplierId), total });
    }

    await conn.commit();
    res.status(201).json({
      orders: createdOrders,
      orderId: createdOrders[0]?.orderId,
      receiptNumber: createdOrders[0]?.receiptNumber,
      total: createdOrders[0]?.total
    });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

/* ── Update delivery status (Supplier only) ────────────────────────── */
app.patch('/api/orders/:id/delivery', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'Supplier')
      return res.status(403).json({ error: 'Only suppliers can update delivery status.' });

    const orderId = Number(req.params.id);
    const { status, scheduledDate } = req.body || {};

    const validStatuses = ['Scheduled', 'InTransit', 'Delivered', 'Failed', 'Rescheduled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid delivery status.' });

    // Verify order belongs to this supplier
    const [[order]] = await pool.execute(
      'SELECT OrderID, SupplierID FROM Orders WHERE OrderID = ?', [orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.SupplierID !== req.user.SupplierID)
      return res.status(403).json({ error: 'You can only update your own orders.' });

    // Check if delivery row exists
    const [[delivery]] = await pool.execute(
      'SELECT DeliveryID FROM Delivery WHERE OrderID = ?', [orderId]
    );

    const effectiveDate = scheduledDate || new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (delivery) {
      await pool.execute(
        'UPDATE Delivery SET Status = ?, ScheduledDate = ? WHERE OrderID = ?',
        [status, effectiveDate, orderId]
      );
    } else {
      await pool.execute(
        'INSERT INTO Delivery (OrderID, ScheduledDate, Status) VALUES (?, ?, ?)',
        [orderId, effectiveDate, status]
      );
    }

    // Also update the Order status to reflect shipment progression
    const orderStatusMap = {
      Scheduled: 'Confirmed',
      InTransit: 'Shipped',
      Rescheduled: 'Confirmed',
      Failed: 'Confirmed',
      Delivered: 'Delivered',
    };
    await pool.execute(
      'UPDATE Orders SET Status = ? WHERE OrderID = ?',
      [orderStatusMap[status], orderId]
    );

    res.json({ message: 'Delivery status updated.', orderId, status });
  } catch (e) { next(e); }
});

/* ── Payment (simulate sandbox) ────────────────────────────────────── */
/*
 * Simulates a payment gateway sandbox. In a real implementation,
 * the frontend would redirect to Paymongo/Stripe; the gateway would
 * call a webhook to confirm payment. Here we simulate with a
 * test-mode flag so the logic is correct and easily swapped out.
 *
 * The key security principle is maintained: payment confirmation
 * comes from a server-side process, not a simple frontend click.
 * The client sends a "pay" request; the server validates, then
 * sets PaymentStatus = 'Paid'. In production, this route would
 * be replaced by a webhook from the actual gateway.
 */
app.post('/api/orders/:id/pay', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'BusinessOwner')
      return res.status(403).json({ error: 'Only business owners can pay for orders.' });

    const orderId = Number(req.params.id);
    const { paymentMethod, notes } = req.body || {};

    const methodKey = String(paymentMethod || '').toLowerCase();
    const validMethods = ['gcash', 'card', 'maya', 'cod', 'bank'];
    if (!validMethods.includes(methodKey))
      return res.status(400).json({ error: 'Invalid payment method.' });

    // Verify order belongs to this tenant
    const [[order]] = await pool.execute(
      `SELECT o.OrderID, o.TenantID, o.TotalAmount, i.InvoiceID, i.PaymentStatus
       FROM Orders o
       LEFT JOIN Invoice i ON i.OrderID = o.OrderID
       WHERE o.OrderID = ?`, [orderId]
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.TenantID !== req.user.TenantID)
      return res.status(403).json({ error: 'Access denied.' });
    if (order.PaymentStatus === 'Paid')
      return res.status(400).json({ error: 'This order has already been paid.' });
    if (!order.InvoiceID)
      return res.status(400).json({ error: 'No invoice found for this order.' });

    // Sandbox simulation: COD stays "Unpaid" (collect on delivery), others succeed
    let newStatus = 'Paid';
    let message = 'Payment successful!';

    if (methodKey === 'cod') {
      newStatus = 'Unpaid'; // COD is collected on delivery
      message = 'Order confirmed with Cash on Delivery. Payment will be collected upon delivery.';
    }

    await pool.execute(
      'UPDATE Invoice SET PaymentStatus = ? WHERE InvoiceID = ?',
      [newStatus, order.InvoiceID]
    );

    // Update corresponding Receipt record
    const isPaid = newStatus === 'Paid';
    const txnRef = isPaid ? `TXN-${methodKey.toUpperCase()}-${orderId}-${Date.now().toString(36).toUpperCase()}` : null;
    const receiptType = isPaid ? 'Payment Receipt' : 'Order Receipt';
    const methodLabel = methodKey === 'cod' ? 'Cash on Delivery (Pending)' : methodKey.toUpperCase();

    await pool.execute(`
      UPDATE Receipt
      SET PaymentStatus = ?,
          PaymentMethod = ?,
          PaymentReference = ?,
          ReceiptType = ?,
          PaidAt = ${isPaid ? 'NOW()' : 'NULL'}
      WHERE OrderID = ?
    `, [newStatus, methodLabel, txnRef, receiptType, orderId]);

    res.json({
      success: true,
      message,
      paymentStatus: newStatus,
      paymentReference: txnRef,
      orderId
    });
  } catch (e) { next(e); }
});

/* ── Business Verification: User status and history ────────────────── */
app.get('/api/verification/my-status', auth, async (req, res, next) => {
  try {
    const isSupplier = req.user.Role === 'Supplier';
    const isTenant = req.user.Role === 'BusinessOwner';
    if (!isSupplier && !isTenant) {
      return res.json({
        verificationStatus: 'Verified',
        role: req.user.Role,
        submission: null,
        businessDetails: {
          businessName: req.user.ShopName,
          address: req.user.Address,
          contactNo: req.user.ContactNo,
          businessType: req.user.BusinessType,
          registrationNumber: req.user.RegistrationNumber,
          taxIdNumber: req.user.TaxIdNumber,
        }
      });
    }

    const idField = isSupplier ? 'SupplierID' : 'TenantID';
    const idVal = isSupplier ? req.user.SupplierID : req.user.TenantID;

    const [rows] = await pool.execute(`
      SELECT VerificationID, Role, BusinessName, BusinessType, RegistrationNumber, TaxIdNumber,
             ContactPhone, BusinessAddress, DocumentType, DocumentFileName, DocumentNotes,
             Status, AdminNotes, ReviewedAt, CreatedAt, UpdatedAt
      FROM BusinessVerification
      WHERE ${idField} = ?
      ORDER BY VerificationID DESC LIMIT 1
    `, [idVal]);

    const latest = rows[0] || null;
    res.json({
      verificationStatus: req.user.VerificationStatus || 'Pending Verification',
      VerificationStatus: req.user.VerificationStatus || 'Pending Verification',
      AdminNotes: latest ? latest.AdminNotes : null,
      adminNotes: latest ? latest.AdminNotes : null,
      submission: latest,
      businessDetails: {
        businessName: req.user.ShopName,
        address: req.user.Address,
        contactNo: req.user.ContactNo,
        businessType: req.user.BusinessType,
        registrationNumber: req.user.RegistrationNumber,
        taxIdNumber: req.user.TaxIdNumber,
      }
    });
  } catch (e) { next(e); }
});

/* ── Business Verification: Submit legitimacy documents ────────────── */
app.post('/api/verification/submit', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'BusinessOwner' && req.user.Role !== 'Supplier') {
      return res.status(403).json({ error: 'Only business owners and suppliers can submit business verification.' });
    }

    const {
      businessType, registrationNumber, taxIdNumber,
      businessAddress, address, contactPhone, contactNo, documentType,
      documentFileName, documentFileData, documentBase64, documentNotes, notes
    } = req.body || {};

    const cleanAddress = (businessAddress || address || req.user.Address || '').trim();
    const cleanPhone = (contactPhone || contactNo || req.user.ContactNo || '').trim();
    const cleanNotes = (documentNotes || notes || '').trim();
    const rawData = documentFileData || documentBase64 || null;

    if (!businessType || typeof businessType !== 'string' || businessType.trim().length < 2)
      return res.status(400).json({ error: 'Please specify your business entity type.' });
    if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim().length < 3)
      return res.status(400).json({ error: 'Valid business registration number (DTI / SEC / Mayor’s Permit) is required.' });
    if (!cleanAddress || cleanAddress.length < 5)
      return res.status(400).json({ error: 'Complete registered business address is required.' });
    if (!cleanPhone || cleanPhone.length < 7)
      return res.status(400).json({ error: 'Valid contact phone number is required.' });
    if (!documentType || typeof documentType !== 'string' || documentType.trim().length < 2)
      return res.status(400).json({ error: 'Please select the supporting document type.' });

    // Handle document upload if provided
    let storedFileUrl = null;
    let safeFileName = documentFileName ? documentFileName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'permit_document.pdf';
    if (rawData && typeof rawData === 'string' && rawData.startsWith('data:')) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'verifications');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(safeFileName) || '.pdf';
      const diskName = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(uploadsDir, diskName);
      const base64Data = rawData.split(';base64,').pop();
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      storedFileUrl = `/uploads/verifications/${diskName}`;
    } else if (rawData && typeof rawData === 'string') {
      storedFileUrl = rawData;
    }

    const isSupplier = req.user.Role === 'Supplier';
    const tenantId = isSupplier ? null : req.user.TenantID;
    const supplierId = isSupplier ? req.user.SupplierID : null;

    const [insertResult] = await pool.execute(`
      INSERT INTO BusinessVerification
        (Role, TenantID, SupplierID, UserID, BusinessName, BusinessType, RegistrationNumber, TaxIdNumber,
         ContactPhone, BusinessAddress, DocumentType, DocumentFileName, DocumentFileUrl, DocumentNotes, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification')
    `, [
      req.user.Role, tenantId, supplierId, req.user.UserID,
      req.user.ShopName, businessType.trim(), registrationNumber.trim(), taxIdNumber?.trim() || null,
      cleanPhone, cleanAddress, documentType.trim(),
      safeFileName, storedFileUrl, cleanNotes || null
    ]);

    // Update status in Supplier or Tenant record
    if (isSupplier) {
      await pool.execute(`
        UPDATE Supplier
        SET VerificationStatus = 'Pending Verification',
            BusinessType = ?, RegistrationNumber = ?, TaxIdNumber = ?, Address = ?
        WHERE SupplierID = ?
      `, [businessType.trim(), registrationNumber.trim(), taxIdNumber?.trim() || null, cleanAddress, supplierId]);
    } else {
      await pool.execute(`
        UPDATE Tenant
        SET VerificationStatus = 'Pending Verification',
            BusinessType = ?, RegistrationNumber = ?, TaxIdNumber = ?, Address = ?
        WHERE TenantID = ?
      `, [businessType.trim(), registrationNumber.trim(), taxIdNumber?.trim() || null, cleanAddress, tenantId]);
    }

    res.status(200).json({
      success: true,
      verificationId: insertResult.insertId,
      status: 'Pending Verification',
      message: 'Business verification documents submitted successfully! Your application is now pending administrator review.'
    });
  } catch (e) { next(e); }
});

/* ── Business Verification: Admin Review List ──────────────────────── */
app.get('/api/verification/admin/list', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'Admin')
      return res.status(403).json({ error: 'Only administrators can review verification applications.' });

    const { status } = req.query || {};
    let sql = `
      SELECT bv.VerificationID, bv.Role, bv.TenantID, bv.SupplierID, bv.UserID,
             bv.BusinessName, bv.BusinessType, bv.RegistrationNumber, bv.TaxIdNumber,
             bv.ContactPhone, bv.BusinessAddress, bv.DocumentType, bv.DocumentFileName,
             bv.DocumentFileUrl, bv.DocumentNotes, bv.Status, bv.AdminNotes,
             bv.ReviewedBy, bv.ReviewedAt, bv.CreatedAt, bv.UpdatedAt,
             u.Name AS ApplicantName, u.Email AS ApplicantEmail,
             admin.Name AS ReviewerName
      FROM BusinessVerification bv
      LEFT JOIN Users u ON u.UserID = bv.UserID
      LEFT JOIN Users admin ON admin.UserID = bv.ReviewedBy
    `;
    const args = [];
    if (status && status !== 'All') {
      sql += ' WHERE bv.Status = ?';
      args.push(status);
    }
    sql += ' ORDER BY bv.CreatedAt DESC LIMIT 200';

    const [rows] = await pool.execute(sql, args);
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Business Verification: Admin Decision ─────────────────────────── */
app.patch('/api/verification/admin/:id', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'Admin')
      return res.status(403).json({ error: 'Only administrators can take action on verifications.' });

    const verificationId = Number(req.params.id);
    const { action, reason, decision, notes, adminNotes } = req.body || {};

    let effectiveAction = action;
    if (!effectiveAction && decision) {
      if (decision === 'Verified' || decision === 'approve') effectiveAction = 'approve';
      else if (decision === 'Rejected' || decision === 'reject') effectiveAction = 'reject';
      else if (decision === 'Requires Additional Information' || decision === 'request_info') effectiveAction = 'request_info';
    }
    const effectiveReason = (reason || notes || adminNotes || '').trim();

    const [[record]] = await pool.execute(
      'SELECT * FROM BusinessVerification WHERE VerificationID = ?',
      [verificationId]
    );
    if (!record) return res.status(404).json({ error: 'Verification record not found.' });

    let newStatus;
    if (effectiveAction === 'approve') {
      newStatus = 'Verified';
    } else if (effectiveAction === 'reject') {
      if (!effectiveReason || effectiveReason.length < 5) {
        return res.status(400).json({ error: 'Please provide a clear reason for rejecting the verification (min 5 characters).' });
      }
      newStatus = 'Rejected';
    } else if (effectiveAction === 'request_info') {
      if (!effectiveReason || effectiveReason.length < 5) {
        return res.status(400).json({ error: 'Please specify what additional information or documents are required (min 5 characters).' });
      }
      newStatus = 'Requires Additional Information';
    } else {
      return res.status(400).json({ error: 'Invalid action. Choose approve, reject, or request_info.' });
    }

    await pool.execute(`
      UPDATE BusinessVerification
      SET Status = ?, AdminNotes = ?, ReviewedBy = ?, ReviewedAt = NOW()
      WHERE VerificationID = ?
    `, [newStatus, effectiveReason || null, req.user.UserID, verificationId]);

    // Sync status to Supplier or Tenant record
    if (record.Role === 'Supplier' && record.SupplierID) {
      await pool.execute(
        'UPDATE Supplier SET VerificationStatus = ? WHERE SupplierID = ?',
        [newStatus, record.SupplierID]
      );
    } else if (record.Role === 'BusinessOwner' && record.TenantID) {
      await pool.execute(
        'UPDATE Tenant SET VerificationStatus = ? WHERE TenantID = ?',
        [newStatus, record.TenantID]
      );
    }

    res.json({
      success: true,
      verificationId,
      status: newStatus,
      message: action === 'approve'
        ? 'Business verification approved! The business has been granted Verified status.'
        : action === 'reject'
        ? 'Business verification rejected with reason recorded.'
        : 'Additional information request sent to the business applicant.'
    });
  } catch (e) { next(e); }
});

/* ── Business Verification: Document Viewer (Tenant Isolated) ─────── */
app.get('/api/verification/document/:id', auth, async (req, res, next) => {
  try {
    const verificationId = Number(req.params.id);
    const [[record]] = await pool.execute(
      'SELECT * FROM BusinessVerification WHERE VerificationID = ?',
      [verificationId]
    );
    if (!record) return res.status(404).json({ error: 'Document record not found.' });

    // Strict tenant isolation: one business cannot access another's private documents
    if (req.user.Role === 'BusinessOwner' && record.TenantID !== req.user.TenantID) {
      return res.status(403).json({ error: 'Access denied. You cannot view another business’s private verification documents.' });
    }
    if (req.user.Role === 'Supplier' && record.SupplierID !== req.user.SupplierID) {
      return res.status(403).json({ error: 'Access denied. You cannot view another business’s private verification documents.' });
    }

    res.json({
      verificationId: record.VerificationID,
      businessName: record.BusinessName,
      documentType: record.DocumentType,
      fileName: record.DocumentFileName || 'permit_document.pdf',
      fileUrl: record.DocumentFileUrl || null,
      notes: record.DocumentNotes,
      status: record.Status,
      adminNotes: record.AdminNotes
    });
  } catch (e) { next(e); }
});

/* ── Tenants (shops directory — kept for Admin use) ─────────────────── */
app.get('/api/tenants', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT TenantID, BusinessName, StallNumber, ContactNo, Address,
              VerificationStatus, BusinessType, RegistrationNumber
       FROM Tenant WHERE IsActive = 1 ORDER BY BusinessName`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

/* ── Tenant detail (for Admin) ─────────────────────────────────────── */
app.get('/api/tenants/:id', auth, async (req, res, next) => {
  try {
    if (req.user.Role !== 'Admin')
      return res.status(403).json({ error: 'Admin access required.' });

    const [[tenant]] = await pool.execute(
      `SELECT TenantID, BusinessName, StallNumber, ContactNo, Address,
              VerificationStatus, BusinessType, RegistrationNumber, TaxIdNumber
       FROM Tenant WHERE TenantID = ?`, [Number(req.params.id)]
    );
    if (!tenant) return res.status(404).json({ error: 'Shop not found.' });

    const [users] = await pool.execute(
      `SELECT UserID, Name, Email, ContactNo FROM Users WHERE TenantID = ? AND IsActive = 1`,
      [tenant.TenantID]
    );

    const [orders] = await pool.execute(`
      SELECT o.OrderID, o.OrderDate, o.Status, o.TotalAmount, s.SupplierName,
             COALESCE(r.PaymentStatus, i.PaymentStatus) AS PaymentStatus,
             r.ReceiptNumber
      FROM Orders o
      JOIN Supplier s ON s.SupplierID = o.SupplierID
      LEFT JOIN Invoice i ON i.OrderID = o.OrderID
      LEFT JOIN Receipt r ON r.OrderID = o.OrderID
      WHERE o.TenantID = ?
      ORDER BY o.OrderDate DESC LIMIT 20
    `, [tenant.TenantID]);

    res.json({ ...tenant, users, orders });
  } catch (e) { next(e); }
});

/* ── 404 Fallback ──────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}` });
});

/* ── Error handler ─────────────────────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error('[BACKEND ERROR STACK]:', err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Server error. Check backend logs.' });
  }
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`API ready on port ${PORT}`)
);
