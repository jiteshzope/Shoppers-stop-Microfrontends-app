import type { CookieOptions, Request, Response } from 'express';
import { config } from '../../config/environment';
import type { IssuedSession } from './auth.types';

const { cookie } = config;

const baseOptions: CookieOptions = {
  sameSite: cookie.sameSite,
  secure: cookie.secure,
  path: '/',
};

/**
 * Writes the session pair:
 *
 * - the session token goes into an **httpOnly** cookie, so no script running on
 *   the page — injected or otherwise — can ever read the credential;
 * - the CSRF token goes into a readable cookie, because the SPA has to echo it
 *   back in a request header. It is not a credential on its own: it is only
 *   accepted alongside the matching session cookie.
 */
export function setSessionCookies(res: Response, session: IssuedSession): void {
  res.cookie(cookie.sessionName, session.token, {
    ...baseOptions,
    httpOnly: true,
    maxAge: cookie.maxAgeMs,
  });

  res.cookie(cookie.csrfName, session.csrfToken, {
    ...baseOptions,
    httpOnly: false,
    maxAge: cookie.maxAgeMs,
  });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(cookie.sessionName, baseOptions);
  res.clearCookie(cookie.csrfName, baseOptions);
}

export function readSessionToken(req: Request): string | null {
  const token = req.cookies?.[cookie.sessionName];
  return typeof token === 'string' && token.length > 0 ? token : null;
}
