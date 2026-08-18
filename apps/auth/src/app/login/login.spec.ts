import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Login } from './login';
import { AuthStore } from '../stores/auth.store';

describe('Login', () => {
  const configureTestingModule = async (
    options: { isAuthenticated?: boolean; returnUrl?: string | null; isSubmitting?: boolean } = {},
  ) => {
    const store = {
      refreshSession: vi.fn().mockResolvedValue(false),
      isAuthenticated: vi.fn(() => options.isAuthenticated ?? false),
      isSubmitting: vi.fn(() => options.isSubmitting ?? false),
      error: vi.fn(() => null),
      login: vi.fn().mockResolvedValue(true),
      clearError: vi.fn(),
    };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthStore, useValue: store },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => options.returnUrl ?? null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    return { store, router };
  };

  it('creates the component and refreshes the session on init', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance).toBeTruthy();
    expect(store.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('redirects authenticated users to a safe return url on init', async () => {
    const { router } = await configureTestingModule({ isAuthenticated: true, returnUrl: '/cart' });
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.ngOnInit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  });

  it('falls back to the product route for unsafe return urls', async () => {
    const { router } = await configureTestingModule({ isAuthenticated: true, returnUrl: '//evil.example' });
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.ngOnInit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/product');
  });

  it('submits trimmed credentials and resets the form on success', async () => {
    const { store, router } = await configureTestingModule({ returnUrl: '/cart' });
    const fixture = TestBed.createComponent(Login);
    const form = {
      invalid: false,
      resetForm: vi.fn(),
    } as never;

    fixture.componentInstance.email.set('  test@example.com  ');
    fixture.componentInstance.password.set('Password123');

    await fixture.componentInstance.onSubmit(form);

    expect(store.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password123' });
    expect(form.resetForm).toHaveBeenCalledWith({ email: '', password: '' });
    expect(fixture.componentInstance.email()).toBe('');
    expect(fixture.componentInstance.password()).toBe('');
    expect(fixture.componentInstance.hasAttemptedSubmit()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  });

  it('does not submit when the form is invalid', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.onSubmit({ invalid: true, resetForm: vi.fn() } as never);

    expect(store.login).not.toHaveBeenCalled();
  });

  it('does not submit when a login request is already in flight', async () => {
    const { store } = await configureTestingModule({ isSubmitting: true });
    const fixture = TestBed.createComponent(Login);

    await fixture.componentInstance.onSubmit({ invalid: false, resetForm: vi.fn() } as never);

    expect(store.login).not.toHaveBeenCalled();
  });

  it('delegates error dismissal to the store', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Login);

    fixture.componentInstance.clearError();

    expect(store.clearError).toHaveBeenCalledTimes(1);
  });
});
