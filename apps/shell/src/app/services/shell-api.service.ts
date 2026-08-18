import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { SessionUser } from '@ecommerce-mf/session';
import { environment } from '../../environments/environment';

interface CartApiItem {
  id: number;
}

interface SessionApiResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ShellApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.ecommerceApiBaseUrl.replace(/\/+$/, '');

  getCartItemCount(): Observable<number> {
    return this.http
      .get<CartApiItem[]>(`${this.apiBaseUrl}/cart`)
      .pipe(map((items) => items.length));
  }

  /** Resolves the signed-in user from the httpOnly session cookie. */
  getSessionUser(): Observable<SessionUser> {
    return this.http.get<SessionApiResponse>(`${this.apiBaseUrl}/auth/session`).pipe(
      map(({ user }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roles: ['customer'],
      })),
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<{ message: string }>(`${this.apiBaseUrl}/auth/logout`, {})
      .pipe(map(() => undefined));
  }
}
