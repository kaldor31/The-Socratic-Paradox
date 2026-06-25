import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.statusCode ?? (err instanceof ZodError ? 400 : 500);
  const message = err instanceof ZodError ? 'Validation error' : (err.message ?? 'Internal server error');

  if (isDev) {
    logger.error({ err }, 'Unhandled error');
  } else {
    logger.error({ statusCode, message }, 'Unhandled error');
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
  });
}
