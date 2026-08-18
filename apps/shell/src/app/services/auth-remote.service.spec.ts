import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  AUTH_EVENT_TYPES,
  AUTH_SHELL_CHANNEL,
  REMOTE_SOURCES,
  SESSION_COOKIE_NAMES,
  type AuthChannelEvent,
  type SessionUser,
} from '@ecommerce-mf/session';
import { ShellApiService } from './shell-api.service';
import { ShellRemoteChannelService } from './shell-remote-channel.service';
import { AuthRemoteService } from './auth-remote.service';

const createUser = (email = 'taylor@example.com'): SessionUser => ({
  id: 'user-1',
  name: 'Taylor',
  email,
  phoneNumber: '1234567890',
  roles: ['customer'],
});

/** The readable CSRF cookie is the only client-visible trace of a session. */
const giveSessionCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=csrf-token; path=/`;
};

const clearSessionCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

const publishAuthEvent = (
  channel: ShellRemoteChannelService<AuthChannelEvent>,
  type: string,
) => {
  channel.publish({
    source: REMOTE_SOURCES.AUTH,
    type,
    timestamp: Date.now(),
  });
};

describe('AuthRemoteService', () => {
  let channel: ShellRemoteChannelService<AuthChannelEvent>;
  let shellApi: { getSessionUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clearSessionCookie();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    channel = new ShellRemoteChannelService<AuthChannelEvent>();
    shellApi = { getSessionUser: vi.fn().mockReturnValue(of(createUser())) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SHELL_CHANNEL, useValue: channel },
        { provide: ShellApiService, useValue: shellApi },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearSessionCookie();
  });

  it('restores the session from the API during construction', async () => {
    giveSessionCookie();

    const service = TestBed.inject(AuthRemoteService);
    await service.restoreSession();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.user()?.email).toBe('taylor@example.com');
  });

  it('does not call the API when no session cookie is present', async () => {
    const service = TestBed.inject(AuthRemoteService);
    await service.restoreSession();

    expect(shellApi.getSessionUser).not.toHaveBeenCalled();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('clears the session when the API rejects the cookie', async () => {
    giveSessionCookie();
    shellApi.getSessionUser.mockReturnValue(throwError(() => new Error('unauthorized')));

    const service = TestBed.inject(AuthRemoteService);
    await service.restoreSession();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('reloads session state on auth success events and clears it on logout', async () => {
    const service = TestBed.inject(AuthRemoteService);
    giveSessionCookie();

    publishAuthEvent(channel, AUTH_EVENT_TYPES.LOGIN_SUCCESS);
    await Promise.resolve();

    expect(service.session()).toEqual({ isAuthenticated: true, user: createUser() });

    publishAuthEvent(channel, AUTH_EVENT_TYPES.LOGOUT);

    expect(service.session()).toBeNull();
  });

  it('refreshes the session on remote ready and register success', async () => {
    const service = TestBed.inject(AuthRemoteService);
    giveSessionCookie();

    publishAuthEvent(channel, AUTH_EVENT_TYPES.REMOTE_READY);
    await Promise.resolve();

    expect(service.user()?.email).toBe('taylor@example.com');

    shellApi.getSessionUser.mockReturnValue(of(createUser('jordan@example.com')));
    publishAuthEvent(channel, AUTH_EVENT_TYPES.REGISTER_SUCCESS);
    await Promise.resolve();

    expect(service.user()?.email).toBe('jordan@example.com');
  });

  it('keeps state unchanged for login failed and unknown auth events', () => {
    const service = TestBed.inject(AuthRemoteService);

    publishAuthEvent(channel, AUTH_EVENT_TYPES.LOGIN_FAILED);
    publishAuthEvent(channel, 'unexpected-event');

    expect(service.session()).toBeNull();
    expect(console.log).toHaveBeenCalled();
  });
});
