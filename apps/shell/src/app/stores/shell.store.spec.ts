import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { type SessionState } from '@ecommerce-mf/session';
import { AuthRemoteService } from '../services/auth-remote.service';
import { ShellApiService } from '../services/shell-api.service';
import { ShellStore } from './shell.store';

const createSession = (): SessionState => ({
  isAuthenticated: true,
  user: {
    id: 'user-1',
    name: 'Taylor',
    email: 'taylor@example.com',
    phoneNumber: '1234567890',
    roles: ['customer'],
  },
});

describe('ShellStore', () => {
  let store: InstanceType<typeof ShellStore>;
  let authRemote: { clearSession: ReturnType<typeof vi.fn> };
  let shellApi: {
    getCartItemCount: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authRemote = {
      clearSession: vi.fn(),
    };
    shellApi = {
      getCartItemCount: vi.fn(),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        ShellStore,
        { provide: AuthRemoteService, useValue: authRemote },
        { provide: ShellApiService, useValue: shellApi },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(ShellStore) as InstanceType<typeof ShellStore>;
  });

  it('sets and clears the authenticated shell session', () => {
    const session = createSession();

    store.setAuthSession(session);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.user()?.email).toBe('taylor@example.com');

    store.clearAuthSession();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(store.cartItemCount()).toBe(0);
  });

  it('clamps cart count values at zero', () => {
    store.setCartItemCount(5);
    expect(store.cartItemCount()).toBe(5);

    store.setCartItemCount(-4);
    expect(store.cartItemCount()).toBe(0);
  });

  it('does not call the API when unauthenticated', async () => {
    await store.loadCartItemCount();

    expect(shellApi.getCartItemCount).not.toHaveBeenCalled();
    expect(store.cartItemCount()).toBe(0);
  });

  it('loads and stores the cart item count when authenticated', async () => {
    store.setAuthSession(createSession());
    shellApi.getCartItemCount.mockReturnValue(of(7));

    await store.loadCartItemCount();

    expect(shellApi.getCartItemCount).toHaveBeenCalledTimes(1);
    expect(store.cartItemCount()).toBe(7);
  });

  it('ignores async API results after the user becomes unauthenticated', async () => {
    const pendingCount$ = new Subject<number>();
    store.setAuthSession(createSession());
    shellApi.getCartItemCount.mockReturnValue(pendingCount$);

    const loadPromise = store.loadCartItemCount();
    store.clearAuthSession();
    pendingCount$.next(9);
    pendingCount$.complete();
    await loadPromise;

    expect(store.cartItemCount()).toBe(0);
  });

  it('resets the cart count to zero when the API fails', async () => {
    store.setAuthSession(createSession());
    shellApi.getCartItemCount.mockReturnValue(throwError(() => new Error('boom')));
    store.setCartItemCount(4);

    await store.loadCartItemCount();

    expect(store.cartItemCount()).toBe(0);
  });

  it('navigates to auth entry points', () => {
    store.goToLogin();
    store.goToRegister();

    expect(router.navigateByUrl).toHaveBeenNthCalledWith(1, '/auth/login');
    expect(router.navigateByUrl).toHaveBeenNthCalledWith(2, '/auth/register');
  });

  it('revokes the session, clears remote auth state, and returns to product on logout', async () => {
    store.setAuthSession(createSession());
    store.setCartItemCount(3);

    await store.logout();

    expect(shellApi.logout).toHaveBeenCalledTimes(1);
    expect(authRemote.clearSession).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.cartItemCount()).toBe(0);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/product');
  });
});