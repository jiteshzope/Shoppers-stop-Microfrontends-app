import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { LoginRequest, RegisterRequest } from '@ecommerce-mf/session';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface RegisterApiRequest extends RegisterRequest {
  phoneNumber: string;
}

/**
 * Every auth response carries the user only. The session credential is set by
 * the API as an httpOnly cookie and never reaches JavaScript.
 */
export interface AuthApiResponse {
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

  /** Resolves the signed-in user from the session cookie, or errors with 401. */
  getSession(): Observable<AuthApiResponse> {
    return this.http.get<AuthApiResponse>(`${this.apiBaseUrl}/auth/session`);
  }

  logout(): Observable<void> {
    return this.http
      .post<{ message: string }>(`${this.apiBaseUrl}/auth/logout`, {})
      .pipe(map(() => undefined));
  }
}
