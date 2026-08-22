import { InjectionToken } from '@angular/core';

/**
 * Base URL of the storefront API, including the `/api/v1` prefix.
 *
 * Each app provides it from its own environment file, which is what lets the
 * shared interceptor and `SessionTokenService` live here rather than being
 * copied into every remote.
 */
export const SESSION_API_BASE_URL = new InjectionToken<string>('SESSION_API_BASE_URL');
