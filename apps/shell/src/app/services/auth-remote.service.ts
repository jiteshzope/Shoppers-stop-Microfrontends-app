import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';
import {
  AUTH_SHELL_CHANNEL,
  AUTH_EVENT_TYPES,
  REMOTE_SOURCES,
  hasSessionHint,
  type SessionState,
  type AuthToShellEvent,
} from '@ecommerce-mf/session';
import { ShellApiService } from './shell-api.service';

/**
 * Keeps the shell's view of the session in step with the auth remote.
 *
 * The session credential itself is an httpOnly cookie the shell can neither read
 * nor forge, so "restoring" a session means asking the API who the caller is
 * rather than reading anything back out of browser storage.
 */
@Injectable({ providedIn: 'root' })
export class AuthRemoteService {
  private readonly authChannel = inject(AUTH_SHELL_CHANNEL, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellApi = inject(ShellApiService);
  private readonly sessionState = signal<SessionState | null>(null);

  /**
   * Tracks the in-flight session lookup so that consumers which must not act on
   * a half-known session — route guards, above all — can wait for it.
   */
  private sessionResolution: Promise<void>;

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState()?.isAuthenticated ?? false);
  readonly user = computed(() => this.sessionState()?.user ?? null);

  constructor() {
    this.sessionResolution = this.restoreSession();

    this.authChannel?.events$
      .pipe(
        filter((event): event is AuthToShellEvent => event.source === REMOTE_SOURCES.AUTH),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.handleAuthEvent(event));
  }

  // ─── Receive events from auth remote ────────────────────────────────────────

  private handleAuthEvent(event: AuthToShellEvent): void {
    switch (event.type) {
      case AUTH_EVENT_TYPES.REMOTE_READY:
        void this.restoreSession();
        console.log('[Shell ← Auth] Remote is ready');
        break;

      case AUTH_EVENT_TYPES.LOGIN_SUCCESS:
        void this.restoreSession();
        console.log('[Shell ← Auth] Login succeeded');
        break;

      case AUTH_EVENT_TYPES.LOGIN_FAILED:
        console.log('[Shell ← Auth] Login failed');
        break;

      case AUTH_EVENT_TYPES.LOGOUT:
        this.clearSession();
        console.log('[Shell ← Auth] User logged out');
        break;

      case AUTH_EVENT_TYPES.REGISTER_SUCCESS:
        void this.restoreSession();
        console.log('[Shell ← Auth] Registration succeeded');
        break;

      default:
        console.log('[Shell ← Auth] Unknown event type:', event.type);
    }
  }

  clearSession(): void {
    this.sessionState.set(null);
    this.sessionResolution = Promise.resolve();
  }

  restoreSession(): Promise<void> {
    this.sessionResolution = this.loadSession();
    return this.sessionResolution;
  }

  /** Resolves once the current session lookup has settled, successfully or not. */
  whenSessionResolved(): Promise<void> {
    return this.sessionResolution;
  }

  private async loadSession(): Promise<void> {
    if (!hasSessionHint()) {
      this.sessionState.set(null);
      return;
    }

    try {
      const user = await firstValueFrom(this.shellApi.getSessionUser());
      this.sessionState.set({ isAuthenticated: true, user });
    } catch {
      this.sessionState.set(null);
    }
  }
}
