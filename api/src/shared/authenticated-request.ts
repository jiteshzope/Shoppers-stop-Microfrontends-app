import type { Request } from 'express';
import type { SafeUser } from '../modules/auth/auth.types';

/** Request shape produced by `authenticate`, with the resolved session attached. */
export interface AuthenticatedRequest extends Request {
  currentUser: SafeUser;
  sessionToken: string;
  sessionCsrfToken: string;
}
