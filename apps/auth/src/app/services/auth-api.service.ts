import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginRequest, RegisterRequest, type AuthTokensResponse } from '@ecommerce-mf/session';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  roles: string[];
}

export interface RegisterApiRequest extends RegisterRequest {
  phoneNumber: string;
}

/**
 * Login and registration answer with the signed-in user *and* a token pair.
 * `SessionTokenService` is what actually keeps the tokens; the store only ever
 * hands them over to it.
 */
export type AuthApiResponse = AuthTokensResponse;

/** `/auth/session` identifies the caller behind the access token. */
export interface SessionApiResponse {
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly apiBaseUrl = environment.authApiBaseUrl.replace(/\/+$/, '');
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl}/auth/login`, {
      email: request.email,
      password: request.password,
    });
  }

  register(request: RegisterApiRequest): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${this.apiBaseUrl}/auth/register`, {
      name: request.name,
      email: request.email,
      password: request.password,
      confirmPassword: request.confirmPassword,
      phoneNumber: request.phoneNumber,
    });
  }

  /**
   * Resolves the signed-in user from the access token. On a cold load there is
   * no access token yet, so the interceptor answers the 401 by refreshing and
   * replaying this call.
   */
  getSession(): Observable<SessionApiResponse> {
    return this.http.get<SessionApiResponse>(`${this.apiBaseUrl}/auth/session`);
  }
}
