/**
 * Cookie names issued by the API when a session is created.
 *
 * The session token itself lives in an `httpOnly` cookie that no script can
 * read, so it is deliberately absent from this file — nothing in the browser
 * ever needs (or is able) to touch it.
 */
export const SESSION_COOKIE_NAMES = {
  /**
   * Per-session CSRF token. Readable on purpose: the SPA has to echo it back in
   * a request header, which is something a cross-site page cannot do. It is not
   * a credential — the API only accepts it together with the session cookie.
   */
  CSRF: 'ecommerce_csrf',
} as const;

/** Header the API expects the CSRF token in on state-changing requests. */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function readCsrfToken(): string | null {
  return readCookie(SESSION_COOKIE_NAMES.CSRF);
}

/**
 * Cheap, synchronous hint about whether a session is likely active.
 *
 * The CSRF cookie is issued and cleared alongside the session cookie, so its
 * presence mirrors the session without exposing anything secret. Use it to skip
 * pointless requests or to decide on a redirect; the API remains the only
 * authority on whether a session is actually valid.
 */
export function hasSessionHint(): boolean {
  return readCsrfToken() !== null;
}
