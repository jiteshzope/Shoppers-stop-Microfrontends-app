import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { csrfTokenMatches } from '../modules/auth/auth.service';
import type { AuthenticatedRequest } from '../shared/authenticated-request';
import { forbidden } from '../shared/http-error';

export const CSRF_HEADER = 'x-csrf-token';

/**
 * Guards state-changing requests that authenticate through the session cookie.
 * The browser attaches that cookie automatically, so the caller additionally has
 * to prove it can read the per-session CSRF token — something a cross-site page
 * cannot do. Must run after `authenticate`.
 */
export const verifyCsrfToken: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const expected = (req as AuthenticatedRequest).sessionCsrfToken;
  const received = req.header(CSRF_HEADER);

  if (!expected || !received || !csrfTokenMatches(expected, received)) {
    next(forbidden('INVALID_CSRF_TOKEN'));
    return;
  }

  next();
};
