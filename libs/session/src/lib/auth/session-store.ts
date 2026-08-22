/**
 * Where the two tokens live in the browser.
 *
 * The **access token** is held in memory only. It is short-lived and is never
 * written to storage, so a reload or a new tab starts without one and mints a
 * fresh one from the refresh token.
 *
 * The **refresh token** is persisted, because a session has to survive a reload.
 * The API also sets it as an httpOnly cookie, which is the safer carrier and is
 * used automatically wherever it works — but that cookie is third-party once the
 * API and the storefront sit on different sites (the Railway deployment), and
 * browsers increasingly refuse to send those. Persisting it here is what keeps
 * the session working in that topology; the trade-off is that a script running
 * on the page could read it, so it is worth keeping the refresh TTL modest.
 */

/** Exported so tests can seed and clear a session the way the app does. */
export const REFRESH_TOKEN_STORAGE_KEY = 'ecommerce_refresh_token';

/**
 * Module Federation usually gives every remote the *same* copy of this library,
 * but that is a build-time guarantee rather than something the session should
 * depend on. Parking the in-memory token on a well-known global means that even
 * if two copies were ever loaded, both read and write the one holder.
 */
const ACCESS_TOKEN_SLOT = '__ecommerceMfAccessToken__';

interface AccessTokenSlot {
  value: string | null;
}

function slot(): AccessTokenSlot {
  const globalScope = globalThis as unknown as Record<string, AccessTokenSlot | undefined>;
  const existing = globalScope[ACCESS_TOKEN_SLOT];

  if (existing) {
    return existing;
  }

  const created: AccessTokenSlot = { value: null };
  globalScope[ACCESS_TOKEN_SLOT] = created;
  return created;
}

export function getAccessToken(): string | null {
  return slot().value;
}

export function setAccessToken(token: string | null): void {
  slot().value = token;
}

/**
 * Storage can throw rather than merely being empty — Safari's private mode and
 * "block all cookies" both do it — so every access is guarded. Losing the token
 * degrades to "signed out", which is the safe direction.
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readRefreshToken(): string | null {
  try {
    const token = storage()?.getItem(REFRESH_TOKEN_STORAGE_KEY);
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function writeRefreshToken(token: string): void {
  try {
    storage()?.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } catch {
    // A session that cannot be persisted still works until the tab closes.
  }
}

export function clearRefreshToken(): void {
  try {
    storage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Nothing to do; the in-memory access token is cleared regardless.
  }
}

/**
 * Cheap, synchronous hint about whether a session is likely active.
 *
 * A stored refresh token means the shopper signed in at some point; it says
 * nothing about whether the token is still valid. Use it to skip pointless
 * requests or to decide on a redirect — the API remains the only authority.
 */
export function hasSessionHint(): boolean {
  return readRefreshToken() !== null;
}
