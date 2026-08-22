import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  REFRESH_TOKEN_STORAGE_KEY,
  SESSION_API_BASE_URL,
  SessionTokenService,
} from '@ecommerce-mf/session';
import { AUTH_MESSAGES } from '../constants/auth-constants';
import { AuthApiService, type AuthApiResponse } from '../services/auth-api.service';
import { AuthShellBridgeService } from '../services/auth-shell-bridge.service';
import { AuthStore } from './auth.store';

const createResponse = (email = 'taylor@example.com'): AuthApiResponse => ({
  user: {
    id: 'user-1',
    name: 'Taylor',
    email,
    phoneNumber: '+12345678901',
    roles: ['USER'],
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
  tokenType: 'Bearer',
});

/** `/auth/session` answers with the user alone — no tokens are reissued. */
const createSessionResponse = (email = 'taylor@example.com') => ({
  user: createResponse(email).user,
});

/** A stored refresh token is the client-visible trace of a session. */
const giveStoredSession = (): void => {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'stored-refresh-token');
};

const clearStoredSession = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let api: {
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  let session: {
    adopt: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let bridge: {
    publishRemoteReady: ReturnType<typeof vi.fn>;
    publishLoginSuccess: ReturnType<typeof vi.fn>;
    publishLoginFailed: ReturnType<typeof vi.fn>;
    publishLogout: ReturnType<typeof vi.fn>;
    publishRegisterSuccess: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    clearStoredSession();
    api = {
      login: vi.fn(),
      register: vi.fn(),
      getSession: vi.fn(),
    };
    session = {
      adopt: vi.fn(),
      clear: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    bridge = {
      publishRemoteReady: vi.fn(),
      publishLoginSuccess: vi.fn(),
      publishLoginFailed: vi.fn(),
      publishLogout: vi.fn(),
      publishRegisterSuccess: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        
        AuthStore,
        { provide: AuthApiService, useValue: api },
        { provide: SessionTokenService, useValue: session },
        { provide: AuthShellBridgeService, useValue: bridge },
      ],
    });

    store = TestBed.inject(AuthStore) as InstanceType<typeof AuthStore>;
  });

  afterEach(() => {
    clearStoredSession();
  });

  it('restores the session from the API and notifies the shell bridge', async () => {
    giveStoredSession();
    api.getSession.mockReturnValue(of(createSessionResponse()));

    await store.initialize();

    expect(bridge.publishRemoteReady).toHaveBeenCalledTimes(1);
    expect(bridge.publishLoginSuccess).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.email).toBe('taylor@example.com');
  });

  it('skips the session request entirely when nothing has been stored', async () => {
    await store.initialize();

    expect(api.getSession).not.toHaveBeenCalled();
    expect(store.isAuthenticated()).toBe(false);
    expect(bridge.publishLoginSuccess).not.toHaveBeenCalled();
  });

  it('clears stale auth state when the API rejects the stored session', async () => {
    giveStoredSession();
    api.getSession.mockReturnValue(of(createSessionResponse('jordan@example.com')));
    await store.refreshSession();
    expect(store.isAuthenticated()).toBe(true);

    api.getSession.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'UNAUTHORIZED' } })),
    );

    await store.refreshSession();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
  });

  it('logs in successfully and notifies the shell', async () => {
    api.login.mockReturnValue(of(createResponse()));

    const result = await store.login({ email: 'test@example.com', password: 'Password123' });

    expect(result).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.email).toBe('taylor@example.com');
    expect(store.error()).toBeNull();
    expect(bridge.publishLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it('maps login failures to the invalid-login message and publishes failure', async () => {
    api.login.mockReturnValue(throwError(() => new Error('boom')));

    const result = await store.login({ email: 'test@example.com', password: 'Password123' });

    expect(result).toBe(false);
    expect(store.error()).toBe(AUTH_MESSAGES.INVALID_LOGIN);
    expect(store.isSubmitting()).toBe(false);
    expect(bridge.publishLoginFailed).toHaveBeenCalledTimes(1);
  });

  it('registers successfully and publishes register success', async () => {
    api.register.mockReturnValue(of(createResponse('jordan@example.com')));

    const result = await store.register({
      name: 'Taylor',
      email: 'test@example.com',
      phoneNumber: '+12345678901',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(result).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.email).toBe('jordan@example.com');
    expect(bridge.publishRegisterSuccess).toHaveBeenCalledTimes(1);
  });

  it('maps register API errors to email-in-use and generic fallback messages', async () => {
    api.register.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'EMAIL_IN_USE' } })),
    );

    const emailInUse = await store.register({
      name: 'Taylor',
      email: 'test@example.com',
      phoneNumber: '+12345678901',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(emailInUse).toBe(false);
    expect(store.error()).toBe(AUTH_MESSAGES.EMAIL_IN_USE);

    api.register.mockReturnValueOnce(throwError(() => new Error('boom')));

    const genericFailure = await store.register({
      name: 'Taylor',
      email: 'test@example.com',
      phoneNumber: '+12345678901',
      password: 'Password123',
      confirmPassword: 'Password123',
    });

    expect(genericFailure).toBe(false);
    expect(store.error()).toBe(AUTH_MESSAGES.REGISTER_FAILED);
  });

  it('revokes the session on the API, clears state, and publishes logout', async () => {
    giveStoredSession();
    api.getSession.mockReturnValue(of(createSessionResponse()));
    await store.initialize();

    store.logout();

    expect(session.logout).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(bridge.publishLogout).toHaveBeenCalledTimes(1);
  });

  it('still clears local state and publishes logout when the API call fails', () => {
    session.logout.mockRejectedValue(new Error('offline'));

    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(bridge.publishLogout).toHaveBeenCalledTimes(1);
  });

  it('clears the current error message', async () => {
    api.login.mockReturnValue(throwError(() => new Error('boom')));
    await store.login({ email: 'test@example.com', password: 'Password123' });

    expect(store.error()).toBe(AUTH_MESSAGES.INVALID_LOGIN);

    store.clearError();

    expect(store.error()).toBeNull();
  });
});
