import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { userRepository } from '../repositories/userRepository.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email?: string | null;
        isAnonymous: boolean;
        language: string;
      };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies?.['sp-access-token'] || tokenFromHeader;

  if (!token) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = await authService.verifyAccessToken(token);
    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ ok: false, error: 'User not found' });
      return;
    }
    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email,
      isAnonymous: user.isAnonymous,
      language: user.language,
    };
    next();
  } catch (err) {
    res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

