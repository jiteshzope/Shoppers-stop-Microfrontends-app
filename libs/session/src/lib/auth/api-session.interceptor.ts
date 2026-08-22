import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SESSION_API_BASE_URL } from './session-api.tokens';
import { SessionTokenService } from './session-token.service';

/**
 * Endpoints that establish or end a session. They carry their own credentials,
 * so there is nothing to re-attach, and retrying one of them after a refresh
 * would either loop or replay a rotated token.
 */
const SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

function authorize<T>(request: HttpRequest<T>, accessToken: string | null): HttpRequest<T> {
  return request.clone({
    // Also lets the httpOnly refresh cookie travel wherever the API and the
    // storefront are same-site.
    withCredentials: true,
    ...(accessToken ? { setHeaders: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
}

/**
 * Attaches the access token to every API call, and recovers from an expired one.
 *
 * Access tokens are deliberately short-lived, so a 401 is an ordinary event
 * rather than an error: the interceptor exchanges the refresh token for a new
 * pair and replays the original request once. Only if that exchange fails does
 * the 401 reach the caller, which is the app's cue to send the shopper to login.
 */
export const apiSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(SESSION_API_BASE_URL).replace(/\/+$/, '');

  if (!req.url.startsWith(apiBaseUrl)) {
    return next(req);
  }

  const session = inject(SessionTokenService);
  const isSessionEndpoint = SESSION_ENDPOINTS.some((path) =>
    req.url.startsWith(`${apiBaseUrl}${path}`),
  );

  return next(authorize(req, session.accessToken)).pipe(
    catchError((error: unknown) => {
      const isExpiredToken =
        error instanceof HttpErrorResponse && error.status === 401 && !isSessionEndpoint;

      if (!isExpiredToken) {
        return throwError(() => error);
      }

      return from(session.refresh()).pipe(
        switchMap((refreshed) =>
          refreshed
            ? next(authorize(req, refreshed.accessToken))
            : throwError(() => error),
        ),
      );
    }),
  );
};
