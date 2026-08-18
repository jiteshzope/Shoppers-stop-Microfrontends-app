import { Injectable, inject } from '@angular/core';
import {
  AUTH_SHELL_CHANNEL,
  AUTH_EVENT_TYPES,
  REMOTE_SOURCES,
  type AuthToShellEvent,
} from '@ecommerce-mf/session';

@Injectable({ providedIn: 'root' })
export class AuthShellBridgeService {
  private readonly authChannel = inject(AUTH_SHELL_CHANNEL, { optional: true });

  // --- Send events to shell ----------------------------------------------------

  private publish(event: Omit<AuthToShellEvent, 'source' | 'timestamp'>): void {
    this.authChannel?.publish({
      ...event,
      source: REMOTE_SOURCES.AUTH,
      timestamp: Date.now(),
    });
  }

  publishRemoteReady(): void {
    this.publish({
      type: AUTH_EVENT_TYPES.REMOTE_READY,
    });
  }

  publishLoginSuccess(): void {
    this.publish({
      type: AUTH_EVENT_TYPES.LOGIN_SUCCESS,
    });
  }

  publishLoginFailed(): void {
    this.publish({
      type: AUTH_EVENT_TYPES.LOGIN_FAILED,
    });
  }

  publishLogout(): void {
    this.publish({
      type: AUTH_EVENT_TYPES.LOGOUT,
    });
  }

  publishRegisterSuccess(): void {
    this.publish({
      type: AUTH_EVENT_TYPES.REGISTER_SUCCESS,
    });
  }
}
