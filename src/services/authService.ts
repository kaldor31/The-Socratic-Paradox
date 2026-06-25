import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes, randomInt } from 'crypto';
import { userRepository } from '../repositories/userRepository.js';
import { logger } from '../utils/logger.js';
import type { User } from '../types/index.js';

const DEFAULT_SECRET = 'dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  throw new Error('JWT_SECRET must be set to a strong random value in production');
}

const BCRYPT_ROUNDS = 12;
const VERIFICATION_EXPIRES_MINUTES = 30;
const RESET_EXPIRES_MINUTES = 30;

export interface RegisterDto {
  email: string;
  password: string;
  handle?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyDto {
  email: string;
  code: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

function generateVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

function signTokens(user: User): AuthTokens {
  const payload = { userId: user.id, email: user.email, isAnonymous: user.isAnonymous };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

async function sendEmailCode(email: string, code: string, subject: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'noreply@socratic-paradox.app';

  if (process.env.NODE_ENV === 'development') {
    logger.info({ email, code, subject }, 'Email code (development only)');
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    logger.warn('SMTP not configured; code not sent');
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort || 587,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text: `Your verification code is: ${code}\n\nIt expires in ${VERIFICATION_EXPIRES_MINUTES} minutes.`,
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in ${VERIFICATION_EXPIRES_MINUTES} minutes.</p>`,
  });
}

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: User; message: string }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const code = generateVerificationCode();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRES_MINUTES * 60 * 1000).toISOString();

    const user = await userRepository.createRegistered({
      email,
      handle: dto.handle?.trim() || null,
      passwordHash,
      verificationCode: code,
      verificationExpiresAt,
    });

    try {
      await sendEmailCode(email, code, 'Verify your Socratic Paradox account');
      return { user, message: 'Verification code sent to email' };
    } catch (err) {
      logger.error({ err, email }, 'Failed to send verification email');
      return {
        user,
        message: 'Verification code created. Please check the server logs or your spam folder.',
      };
    }
  }

  async verify(dto: VerifyDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (user.isVerified) throw new Error('Account already verified');
    if (user.verificationCode !== dto.code) throw new Error('Invalid verification code');
    if (user.verificationExpiresAt && new Date(user.verificationExpiresAt) < new Date()) {
      throw new Error('Verification code expired');
    }

    await userRepository.markVerified(user.id);
    const refreshed = await userRepository.findById(user.id);
    if (!refreshed) throw new Error('User not found');
    return { user: refreshed, tokens: signTokens(refreshed) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) throw new Error('Invalid email or password');
    if (!user.isVerified) throw new Error('Please verify your email first');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new Error('Invalid email or password');

    return { user, tokens: signTokens(user) };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) throw new Error('If this email exists, a reset code has been sent');

    const token = generateResetToken();
    const resetExpiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000).toISOString();
    await userRepository.setResetToken(user.id, token, resetExpiresAt);

    await sendEmailCode(email, token, 'Reset your Socratic Paradox password');
    return { message: 'If this email exists, a reset code has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) throw new Error('Invalid reset request');
    if (user.resetToken !== dto.token) throw new Error('Invalid reset code');
    if (user.resetExpiresAt && new Date(user.resetExpiresAt) < new Date()) {
      throw new Error('Reset code expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await userRepository.updatePassword(user.id, passwordHash);
    await userRepository.clearResetToken(user.id);

    const refreshed = await userRepository.findById(user.id);
    if (!refreshed) throw new Error('User not found');
    return { user: refreshed, tokens: signTokens(refreshed) };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string };
    const user = await userRepository.findById(decoded.userId);
    if (!user) throw new Error('User not found');
    return { user, tokens: signTokens(user) };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string; email?: string | null; isAnonymous: boolean }> {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email?: string; isAnonymous: boolean };
    return decoded;
  }
}

export const authService = new AuthService();
