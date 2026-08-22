import type { SessionUser } from './session-user';

/**
 * Client-side view of the signed-in user.
 *
 * There is deliberately no token field here: the access token lives in memory
 * inside `SessionTokenService` and the refresh token in browser storage, so
 * neither ends up duplicated in component or store state.
 */
export interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
}
