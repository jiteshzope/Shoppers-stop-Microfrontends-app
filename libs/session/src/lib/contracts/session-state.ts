import type { SessionUser } from './session-user';

/**
 * Client-side view of the signed-in user.
 *
 * There is deliberately no token field: the session credential lives only in an
 * httpOnly cookie managed by the API, so it is never present in application
 * state, in storage, or anywhere else a script could reach it.
 */
export interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
}
