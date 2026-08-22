import type { Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';

export const REFRESH_COOKIE_NAME = 'ecommerce_refresh';

/**
 * Mirrors the refresh token into an httpOnly cookie.
 *
 * A browser client that can use it never has to hold the token in JavaScript,
 * which puts it out of reach of anything injected into the page. The cookie is
 * scoped to `/api/v1/auth`, so it is not attached to ordinary catalogue or cart
 * calls. The access token is deliberately *not* mirrored: it is short-lived and
 * belongs in the `Authorization` header, which no cross-site page can forge.
 */
export function setRefreshCookie(
  response: Response,
  config: AppConfigService,
  token: string,
  expiresAt: Date,
): void {
  const maxAgeMs = Math.max(0, expiresAt.getTime() - Date.now());
  response.cookie(REFRESH_COOKIE_NAME, token, config.refreshCookieOptions(maxAgeMs));
}

export function clearRefreshCookie(response: Response, config: AppConfigService): void {
  const { maxAge: _maxAge, ...options } = config.refreshCookieOptions(0);
  response.clearCookie(REFRESH_COOKIE_NAME, options);
}
