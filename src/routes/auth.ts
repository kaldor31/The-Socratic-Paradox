import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { authService } from '../services/authService.js';
import type { AuthTokens } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { userRepository } from '../repositories/userRepository.js';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
  },
});

router.use(authLimiter);

function setAuthCookies(res: Response, tokens: AuthTokens) {
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
  };
  res.cookie('sp-access-token', tokens.accessToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('sp-refresh-token', tokens.refreshToken, {
    ...options,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('sp-access-token', { sameSite: 'lax' as const, secure: isProduction });
  res.clearCookie('sp-refresh-token', { sameSite: 'lax' as const, secure: isProduction });
}

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  handle: z.string().min(3).max(32).optional(),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  email: z.string().email(),
  token: z.string().length(64),
  newPassword: z.string().min(8).max(100),
});

const languageSchema = z.object({
  language: z.enum(['en', 'ru']),
});

const emailChangeRequestSchema = z.object({
  password: z.string().min(8),
  newEmail: z.string().email().max(255),
});

const emailChangeConfirmSchema = z.object({
  newEmail: z.string().email().max(255),
  code: z.string().length(6),
});

const handleSchema = z.object({
  handle: z.string().min(3).max(32),
});

router.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = registerSchema.parse(req.body);
    const result = await authService.register(dto);
    res.status(201).json({ ok: true, user: sanitizeUser(result.user), message: result.message });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = verifySchema.parse(req.body);
    const result = await authService.verify(dto);
    setAuthCookies(res, result.tokens);
    res.json({
      ok: true,
      user: sanitizeUser(result.user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto);
    setAuthCookies(res, result.tokens);
    res.json({
      ok: true,
      user: sanitizeUser(result.user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = forgotSchema.parse(req.body);
    const result = await authService.forgotPassword(dto);
    res.json({ ok: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = resetSchema.parse(req.body);
    const result = await authService.resetPassword(dto);
    setAuthCookies(res, result.tokens);
    res.json({
      ok: true,
      user: sanitizeUser(result.user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies['sp-refresh-token'];
    if (!refreshToken) {
      res.status(401).json({ ok: false, error: 'Refresh token missing' });
      return;
    }
    const result = await authService.refresh(refreshToken);
    setAuthCookies(res, result.tokens);
    res.json({
      ok: true,
      user: sanitizeUser(result.user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/logout', async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/auth/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepository.findById(req.userId!);
    if (!user) {
      res.status(404).json({ ok: false, error: 'User not found' });
      return;
    }
    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/auth/me/language', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language } = languageSchema.parse(req.body);
    await userRepository.updateLanguage(req.userId!, language);
    res.json({ ok: true, language });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/me/email/change', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, newEmail } = emailChangeRequestSchema.parse(req.body);
    const result = await authService.requestEmailChange(req.userId!, password, newEmail);
    res.json({ ok: true, message: result.message });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/me/email/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newEmail, code } = emailChangeConfirmSchema.parse(req.body);
    const result = await authService.confirmEmailChange(req.userId!, newEmail, code);
    res.json({ ok: true, user: sanitizeUser(result.user) });
  } catch (err) {
    next(err);
  }
});

router.patch('/auth/me/handle', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { handle } = handleSchema.parse(req.body);
    const result = await authService.updateHandle(req.userId!, handle);
    res.json({ ok: true, user: sanitizeUser(result.user) });
  } catch (err) {
    next(err);
  }
});

function sanitizeUser(user: { id: string; email?: string | null; handle?: string | null; isAnonymous: boolean; isVerified: boolean; language: string; createdAt: string }) {
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    isAnonymous: user.isAnonymous,
    isVerified: user.isVerified,
    language: user.language,
    createdAt: user.createdAt,
  };
}

export default router;
