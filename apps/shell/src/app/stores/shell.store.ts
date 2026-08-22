import { Injector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Router } from '@angular/router';
import { SessionState, SessionTokenService, type SessionUser } from '@ecommerce-mf/session';
import { AuthRemoteService } from '../services/auth-remote.service';
import { CartRemoteService } from '../services/cart-remote.service';
import { ProductRemoteService } from '../services/product-remote.service';
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
      injector = inject(Injector),
      shellApi = inject(ShellApiService),
      session = inject(SessionTokenService),
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
        // Revokes the refresh token server-side and drops the local pair. It is
        // best effort — the local session is cleared either way.
        await session.logout();

        authRemote.clearSession();
        patchState(store, signedOutState);

        // Logging out from /product does not change the route, so the remotes
        // are never re-created and would keep showing the old shopper's cart
        // counts. They are told explicitly instead.
        //
        // Resolved here rather than injected: both services inject this store
        // for the inbound direction, so taking them as constructor
        // dependencies would close a cycle.
        injector.get(ProductRemoteService).sendSessionCleared();
        injector.get(CartRemoteService).sendSessionCleared();

        await router.navigateByUrl('/product');
      },
    }),
  ),
);
