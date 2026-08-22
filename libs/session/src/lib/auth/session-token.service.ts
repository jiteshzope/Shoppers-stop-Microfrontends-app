import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { SessionUser } from '../contracts/session-user';
import { SESSION_API_BASE_URL } from './session-api.tokens';
import {
  clearRefreshToken,
  getAccessToken,
  hasSessionHint,
  readRefreshToken,
  setAccessToken,
  writeRefreshToken,
} from './session-store';

/** Body returned by `/auth/login`, `/auth/register` and `/auth/refresh`. */
export interface AuthTokensResponse {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Name of the cross-tab lock. Two tabs refreshing at once would each present the
 * same refresh token; the API rotates on every refresh and treats a replayed
 * token as theft, so the second call would revoke the whole family and sign the
 * shopper out of both tabs.
 */
const REFRESH_LOCK = 'ecommerce-mf-session-refresh';

interface LockCapableNavigator {
  locks?: { request<T>(name: string, callback: () => Promise<T>): Promise<T> };
}

/**
 * Owns the token pair and the one operation that must never run concurrently.
 *
 * Provided in root, so inside the shell every federated remote shares the single
 * instance and a standalone remote gets its own — both correct.
 */
@Injectable({ providedIn: 'root' })
export class SessionTokenService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(SESSION_API_BASE_URL).replace(/\/+$/, '');

  /** De-duplicates refreshes started within this tab. */
  private inFlight: Promise<AuthTokensResponse | null> | null = null;

  get accessToken(): string | null {
    return getAccessToken();
  }

  get hasSession(): boolean {
    return hasSessionHint();
  }

  /** Records the pair returned by a login, registration or refresh. */
  adopt(response: AuthTokensResponse): void {
    setAccessToken(response.accessToken);
    writeRefreshToken(response.refreshToken);
  }

  clear(): void {
    setAccessToken(null);
    clearRefreshToken();
  }

  /**
   * Exchanges the stored refresh token for a new pair, or resolves to `null`
   * when there is nothing to exchange or the token has been revoked.
   */
  refresh(): Promise<AuthTokensResponse | null> {
    this.inFlight ??= this.runExclusively().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  async logout(): Promise<void> {
    const refreshToken = readRefreshToken();

    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.apiBaseUrl}/auth/logout`,
            { refreshToken },
            { withCredentials: true },
          ),
        );
      } catch {
        // Best effort: the local tokens are dropped either way, and the
        // refresh token expires on its own.
      }
    }

    this.clear();
  }

  private async runExclusively(): Promise<AuthTokensResponse | null> {
    const locks = (navigator as Navigator & LockCapableNavigator).locks;

    return locks
      ? locks.request(REFRESH_LOCK, () => this.requestRefresh())
      : this.requestRefresh();
  }

  private async requestRefresh(): Promise<AuthTokensResponse | null> {
    // Re-read rather than closing over the token: another tab may have rotated
    // it while this call was queued behind the lock.
    const refreshToken = readRefreshToken();

    if (!refreshToken) {
      this.clear();
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthTokensResponse>(
          `${this.apiBaseUrl}/auth/refresh`,
          { refreshToken },
          // Lets the httpOnly refresh cookie carry the token instead wherever
          // the API and the storefront are same-site.
          { withCredentials: true },
        ),
      );

      this.adopt(response);
      return response;
    } catch {
      this.clear();
      return null;
    }
  }
}
