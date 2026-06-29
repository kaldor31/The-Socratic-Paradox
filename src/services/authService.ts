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
const EMAIL_CHANGE_EXPIRES_MINUTES = 30;

export interface RegisterDto {
  email: string;
  password: string;
  handle?: string;
  encryptionSalt: string;
  encryptedDataKey: string;
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
  encryptedDataKey: string;
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
      encryptionSalt: dto.encryptionSalt,
      encryptedDataKey: dto.encryptedDataKey,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; token?: string }> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) throw new Error('If this email exists, a reset code has been sent');

    const token = generateResetToken();
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const resetExpiresAt = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000).toISOString();
    await userRepository.setResetToken(user.id, tokenHash, resetExpiresAt);

    await sendEmailCode(email, token, 'Reset your Socratic Paradox password');
    return { message: 'If this email exists, a reset code has been sent', token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await userRepository.findByEmail(email);
    if (!user || !user.passwordHash) throw new Error('Invalid reset request');
    if (!user.resetToken) throw new Error('Invalid reset code');
    const valid = await bcrypt.compare(dto.token, user.resetToken);
    if (!valid) throw new Error('Invalid reset code');
    if (user.resetExpiresAt && new Date(user.resetExpiresAt) < new Date()) {
      throw new Error('Reset code expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await userRepository.updatePassword(user.id, passwordHash);
    await userRepository.updateDataKey(user.id, dto.encryptedDataKey);
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

  async requestEmailChange(userId: string, password: string, newEmail: string): Promise<{ message: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.passwordHash) throw new Error('Password is required to change email');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid password');

    const email = newEmail.toLowerCase().trim();
    if (email === user.email?.toLowerCase()) {
      throw new Error('New email must be different from current email');
    }

    const existing = await userRepository.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new Error('Email already in use');
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_EXPIRES_MINUTES * 60 * 1000).toISOString();
    await userRepository.setEmailChange(userId, email, code, expiresAt);

    try {
      await sendEmailCode(email, code, 'Change your Socratic Paradox email');
      return { message: 'Verification code sent to new email' };
    } catch (err) {
      logger.error({ err, email }, 'Failed to send email change verification');
      return { message: 'Verification code created. Please check the server logs or your spam folder.' };
    }
  }

  async confirmEmailChange(userId: string, newEmail: string, code: string): Promise<{ user: User }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const email = newEmail.toLowerCase().trim();
    if (user.pendingEmail !== email) throw new Error('Email change was not requested');
    if (user.emailChangeCode !== code) throw new Error('Invalid verification code');
    if (user.emailChangeExpiresAt && new Date(user.emailChangeExpiresAt) < new Date()) {
      throw new Error('Verification code expired');
    }

    await userRepository.updateEmail(userId, email);
    const refreshed = await userRepository.findById(userId);
    if (!refreshed) throw new Error('User not found');
    return { user: refreshed };
  }

  async updateHandle(userId: string, handle: string): Promise<{ user: User }> {
    const trimmed = handle.trim();
    if (trimmed.length < 3 || trimmed.length > 32) {
      throw new Error('Handle must be between 3 and 32 characters');
    }

    const existing = await userRepository.findByHandle(trimmed);
    if (existing && existing.id !== userId) {
      throw new Error('Handle already in use');
    }

    await userRepository.updateHandle(userId, trimmed);
    const refreshed = await userRepository.findById(userId);
    if (!refreshed) throw new Error('User not found');
    return { user: refreshed };
  }
}

export const authService = new AuthService();
