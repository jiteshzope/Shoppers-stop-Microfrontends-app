import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { LoginRequest, hasSessionHint } from '@ecommerce-mf/session';
import {
  AuthApiService,
  type AuthApiResponse,
  type AuthUser,
  type RegisterApiRequest,
} from '../services/auth-api.service';
import { AuthShellBridgeService } from '../services/auth-shell-bridge.service';
import { AUTH_MESSAGES } from '../constants/auth-constants';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isSubmitting: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(AuthApiService), bridge = inject(AuthShellBridgeService)) => {
    const applySuccess = (response: AuthApiResponse): void => {
      patchState(store, {
        user: response.user,
        isAuthenticated: true,
        isSubmitting: false,
        error: null,
      });
    };

    const applyFailure = (message: string): void => {
      patchState(store, {
        isSubmitting: false,
        error: message,
      });
    };

    const clearSession = (): void => {
      patchState(store, {
        user: null,
        isAuthenticated: false,
        error: null,
      });
    };

    const readErrorCode = (error: unknown): string | null => {
      if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
        const payload = error.error as { message?: unknown };
        return typeof payload.message === 'string' ? payload.message : null;
      }

      if (error instanceof Error) {
        return error.message;
      }

      return null;
    };

    /**
     * Asks the API who the session cookie belongs to. The cookie hint lets us
     * skip the round trip for visitors who clearly have no session.
     */
    const refreshSession = async (): Promise<boolean> => {
      if (!hasSessionHint()) {
        clearSession();
        return false;
      }

      try {
        const response = await firstValueFrom(api.getSession());
        applySuccess(response);
        return true;
      } catch {
        clearSession();
        return false;
      }
    };

    return {
      refreshSession,

      async initialize(): Promise<void> {
        bridge.publishRemoteReady();

        if (await refreshSession()) {
          bridge.publishLoginSuccess();
        }
      },

      async login(request: LoginRequest): Promise<boolean> {
        patchState(store, {
          isSubmitting: true,
          error: null,
        });

        try {
          applySuccess(await firstValueFrom(api.login(request)));
          bridge.publishLoginSuccess();
          return true;
        } catch {
          applyFailure(AUTH_MESSAGES.INVALID_LOGIN);
          bridge.publishLoginFailed();
          return false;
        }
      },

      async register(request: RegisterApiRequest): Promise<boolean> {
        patchState(store, {
          isSubmitting: true,
          error: null,
        });

        try {
          applySuccess(await firstValueFrom(api.register(request)));
          bridge.publishRegisterSuccess();
          return true;
        } catch (error) {
          const message =
            readErrorCode(error) === 'EMAIL_IN_USE'
              ? AUTH_MESSAGES.EMAIL_IN_USE
              : AUTH_MESSAGES.REGISTER_FAILED;

          applyFailure(message);
          return false;
        }
      },

      logout(): void {
        // Best effort: the local state is cleared either way, and the API drops
        // the session cookie so the credential cannot outlive the click.
        api.logout().subscribe({ error: () => undefined });

        clearSession();
        bridge.publishLogout();
      },

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
);
