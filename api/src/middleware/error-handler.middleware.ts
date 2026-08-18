import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../shared/http-error';
import { logger } from '../shared/logger';

/**
 * Single exit point for failures: expected `HttpError`s keep their status and
 * client-facing code, everything else is logged in full and reported as a
 * generic 500 so internal details never reach the client.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.code });
    return;
  }

  logger.error('Unhandled request failure', {
    method: req.method,
    path: req.path,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });

  res.status(500).json({ message: 'INTERNAL_SERVER_ERROR' });
}
