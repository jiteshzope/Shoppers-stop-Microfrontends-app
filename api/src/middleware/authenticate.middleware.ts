import type { NextFunction, Request, RequestHandler, Response } from 'express';
import * as authService from '../modules/auth/auth.service';
import { readSessionToken } from '../modules/auth/session.cookies';
import type { AuthenticatedRequest } from '../shared/authenticated-request';
import { unauthorized } from '../shared/http-error';

/**
 * Resolves the caller from the httpOnly session cookie and attaches the session
 * to the request. Rejects with 401 when the cookie is missing, unknown or expired.
 */
export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const rawToken = readSessionToken(req);
  if (!rawToken) {
    next(unauthorized());
    return;
  }

  authService
    .resolveSession(rawToken)
    .then((session) => {
      if (!session) {
        next(unauthorized());
        return;
      }

      const authenticatedRequest = req as AuthenticatedRequest;
      authenticatedRequest.currentUser = session.user;
      authenticatedRequest.sessionToken = rawToken;
      authenticatedRequest.sessionCsrfToken = session.csrfToken;
      next();
    })
    .catch(next);
};
