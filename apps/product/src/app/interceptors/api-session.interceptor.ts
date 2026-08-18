import { HttpInterceptorFn } from '@angular/common/http';
import { CSRF_HEADER_NAME, readCsrfToken } from '@ecommerce-mf/session';
import { environment } from '../../environments/environment';

const apiBaseUrl = environment.ecommerceApiBaseUrl.replace(/\/+$/, '');

/** Methods that do not change server state and therefore need no CSRF token. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Attaches the session to every API call.
 *
 * The session itself travels in an httpOnly cookie the browser sends on its own,
 * so no token is ever read from or held by application code. State-changing
 * requests additionally carry the per-session CSRF token, which proves the call
 * came from this origin rather than from a cross-site page riding the cookie.
 */
export const apiSessionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(apiBaseUrl)) {
    return next(req);
  }

  const csrfToken = SAFE_METHODS.has(req.method) ? null : readCsrfToken();

  return next(
    req.clone({
      withCredentials: true,
      ...(csrfToken ? { setHeaders: { [CSRF_HEADER_NAME]: csrfToken } } : {}),
    }),
  );
};
