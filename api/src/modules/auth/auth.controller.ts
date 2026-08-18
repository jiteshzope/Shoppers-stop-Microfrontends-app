import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authenticated-request';
import * as authService from './auth.service';
import { parseLoginPayload, parseRegisterPayload } from './auth.validator';
import { clearSessionCookies, setSessionCookies } from './session.cookies';

export async function register(req: Request, res: Response): Promise<void> {
  const { user, session } = await authService.register(parseRegisterPayload(req.body));

  setSessionCookies(res, session);
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, session } = await authService.login(parseLoginPayload(req.body));

  setSessionCookies(res, session);
  res.status(200).json({ user });
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  await authService.revokeSession(req.sessionToken);

  clearSessionCookies(res);
  res.status(200).json({ message: 'LOGOUT_SUCCESS' });
}

/**
 * Lets the SPA rehydrate on a full page load. The browser proves who it is with
 * the httpOnly cookie, so the front end never has to keep a credential itself.
 */
export function currentSession(req: AuthenticatedRequest, res: Response): void {
  res.status(200).json({ user: req.currentUser });
}
