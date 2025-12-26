import { Request, Response, RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const nodemailer: any = require('nodemailer');
import user from '../models/userModel';

// NOTE: OTPs are now stored in an HTTP-only cookie (signed JWT) with 2 minute TTL.
// This avoids creating DB entries for each OTP request and reduces DB load.

// OTP cookie TTL (2 minutes)
const OTP_TTL_MS = 1000 * 60 * 2; // 2 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

async function getTransporter() {
  // Environment variables optionally supported:
  // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
  const userName = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If SMTP credentials present, use them
  if (host && port && userName && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: userName, pass },
    });
  }

  // DEV FALLBACK: create an Ethereal test account and use it (no env required)
  // This keeps local dev working without needing real SMTP credentials.
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

    const existingUser = await user.findOne({ email });
    if (!existingUser) { res.status(404).json({ message: 'User not found' }); return; }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    // set a signed cookie containing email and otpHash (expires in 2 minutes)
    if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY missing');
    const secret = process.env.SECRET_KEY as string;
    const cookieToken = jwt.sign({ email, otpHash }, secret, { expiresIn: Math.floor(OTP_TTL_MS / 1000) });

    // send email
    const transporter = await getTransporter();
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER || undefined;

    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'Your password reset OTP',
      text: `Your password reset code is ${otp}. It expires in 2 minutes. If you didn't request this, ignore this email.`,
      html: `<p>Your password reset code is <strong>${otp}</strong>. It expires in 2 minutes.</p>`,
    });

    // If using Ethereal (dev fallback) get preview URL
    let previewUrl: string | undefined = undefined;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) console.info('Ethereal preview URL:', previewUrl);
    } catch (e) {}

    // send cookie to browser (httpOnly, secure in prod)
    res.cookie('password_reset', cookieToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: OTP_TTL_MS,
      secure: process.env.NODE_ENV === 'production'
    });

    res.status(200).json({ message: 'OTP sent to email', previewUrl });
    return;
  } catch (err: unknown) {
    console.error('forgotPassword error', err);
    res.status(500).json({ message: 'Failed to send OTP' });
    return;
  }
};

export const verifyOtp: RequestHandler = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) { res.status(400).json({ message: 'OTP required' }); return; }

    // read signed OTP cookie
    const cookieToken = req.cookies?.password_reset;
    if (!cookieToken) { res.status(400).json({ message: 'No OTP request found or it expired' }); return; }

    if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY missing');
    const secret = process.env.SECRET_KEY as string;
    let payload: any;
    try {
      payload = jwt.verify(cookieToken, secret) as { email: string; otpHash: string };
    } catch (e) {
      res.status(400).json({ message: 'OTP expired or invalid' });
      return;
    }

    const { email, otpHash } = payload;
    const match = await bcrypt.compare(otp, otpHash);
    if (!match) { res.status(400).json({ message: 'Invalid OTP' }); return; }

    // success - issue short lived reset token (15 minutes)
    const resetToken = jwt.sign({ email }, secret, { expiresIn: 15 * 60 });

    // clear the cookie to prevent reuse
    res.clearCookie('password_reset');

    res.status(200).json({ resetToken });
    return;
  } catch (err) {
    console.error('verifyOtp error', err);
    res.status(500).json({ message: 'OTP verification failed' });
    return;
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) { res.status(400).json({ message: 'Token and new password required' }); return; }

    if (!process.env.SECRET_KEY) throw new Error('SECRET_KEY missing');
    const secret = process.env.SECRET_KEY as string;

    let payload: any;
    try {
      payload = jwt.verify(resetToken, secret) as { email: string };
    } catch (e) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    const email = payload.email;
    if (!email) { res.status(400).json({ message: 'Invalid token payload' }); return; }

    // validate password strength
    const passwordRegex = /(?=.*[A-Z])(?=.*\d).{6,}/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ message: 'Password must include at least one uppercase letter, one number, and be at least 6 characters long' });
      return;
    }

    const theUser = await user.findOne({ email });
    if (!theUser) { res.status(404).json({ message: 'User not found' }); return; }

    theUser.password = await bcrypt.hash(newPassword, 10);
    await theUser.save();

    // No DB cleanup required now — we used a short-lived cookie/JWT for OTP
    res.status(200).json({ message: 'Password updated successfully' });
    return;
  } catch (err) {
    console.error('resetPassword error', err);
    res.status(500).json({ message: 'Password reset failed' });
    return;
  }
};
