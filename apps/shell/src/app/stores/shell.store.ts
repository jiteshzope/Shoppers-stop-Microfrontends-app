import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Router } from '@angular/router';
import { SessionState, type SessionUser } from '@ecommerce-mf/session';
import { AuthRemoteService } from '../services/auth-remote.service';
import { ShellApiService } from '../services/shell-api.service';

interface ShellState {
  authSession: SessionState | null;
  isAuthenticated: boolean;
  user: SessionUser | null;
  cartItemCount: number;
}

const initialState: ShellState = {
  authSession: null,
  isAuthenticated: false,
  user: null,
  cartItemCount: 0,
};

const signedOutState = {
  authSession: null,
  isAuthenticated: false,
  user: null,
  cartItemCount: 0,
} satisfies ShellState;

export const ShellStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      authRemote = inject(AuthRemoteService),
      shellApi = inject(ShellApiService),
      router = inject(Router),
    ) => ({
      setAuthSession(session: SessionState): void {
        patchState(store, {
          authSession: session,
          isAuthenticated: session.isAuthenticated,
          user: session.user,
        });
      },

      clearAuthSession(): void {
        patchState(store, signedOutState);
      },

      setCartItemCount(cartItemCount: number): void {
        patchState(store, {
          cartItemCount: Math.max(0, cartItemCount),
        });
      },

      async loadCartItemCount(): Promise<void> {
        if (!store.isAuthenticated()) {
          patchState(store, { cartItemCount: 0 });
          return;
        }

        try {
          const cartItemCount = await firstValueFrom(shellApi.getCartItemCount());

          if (!store.isAuthenticated()) {
            return;
          }

          patchState(store, {
            cartItemCount: Math.max(0, cartItemCount),
          });
        } catch {
          if (!store.isAuthenticated()) {
            return;
          }

          patchState(store, { cartItemCount: 0 });
        }
      },

      goToLogin(): void {
        void router.navigateByUrl('/auth/login');
      },

      goToRegister(): void {
        void router.navigateByUrl('/auth/register');
      },

      async logout(): Promise<void> {
        // The session cookie can only be dropped by the API, so the local state
        // is cleared once the server has actually revoked the session.
        try {
          await firstValueFrom(shellApi.logout());
        } catch {
          // Logout is best effort; the local session is cleared either way.
        }

        authRemote.clearSession();
        patchState(store, signedOutState);
        await router.navigateByUrl('/product');
      },
    }),
  ),
);
