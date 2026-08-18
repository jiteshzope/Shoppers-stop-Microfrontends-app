import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Register } from './register';
import { AuthStore } from '../stores/auth.store';

describe('Register', () => {
  const configureTestingModule = async (
    options: { isAuthenticated?: boolean; returnUrl?: string | null; isSubmitting?: boolean } = {},
  ) => {
    const store = {
      refreshSession: vi.fn().mockResolvedValue(false),
      isAuthenticated: vi.fn(() => options.isAuthenticated ?? false),
      isSubmitting: vi.fn(() => options.isSubmitting ?? false),
      error: vi.fn(() => null),
      register: vi.fn().mockResolvedValue(true),
      clearError: vi.fn(),
    };
    const router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Register],
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
    const fixture = TestBed.createComponent(Register);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance).toBeTruthy();
    expect(store.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('redirects authenticated users to a safe return url on init', async () => {
    const { router } = await configureTestingModule({ isAuthenticated: true, returnUrl: '/cart' });
    const fixture = TestBed.createComponent(Register);

    await fixture.componentInstance.ngOnInit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  });

  it('tracks password mismatch only after interaction', async () => {
    await configureTestingModule();
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.password.set('Password123');
    fixture.componentInstance.confirmPassword.set('Password456');

    expect(fixture.componentInstance.passwordsDoNotMatch()).toBe(true);
  });

  it('submits trimmed registration data and resets the form on success', async () => {
    const { store, router } = await configureTestingModule({ returnUrl: '/cart' });
    const fixture = TestBed.createComponent(Register);
    const form = {
      invalid: false,
      resetForm: vi.fn(),
    } as never;

    fixture.componentInstance.name.set('  Taylor Swift  ');
    fixture.componentInstance.email.set('  test@example.com  ');
    fixture.componentInstance.phoneNumber.set('  +12345678901  ');
    fixture.componentInstance.password.set('Password123');
    fixture.componentInstance.confirmPassword.set('Password123');

    await fixture.componentInstance.onSubmit(form);

    expect(store.register).toHaveBeenCalledWith({
      name: 'Taylor Swift',
      email: 'test@example.com',
      phoneNumber: '+12345678901',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expect(form.resetForm).toHaveBeenCalledWith({
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
    });
    expect(fixture.componentInstance.hasAttemptedSubmit()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
  });

  it('does not submit when the form is invalid', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Register);

    await fixture.componentInstance.onSubmit({ invalid: true, resetForm: vi.fn() } as never);

    expect(store.register).not.toHaveBeenCalled();
  });

  it('does not submit when passwords do not match', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.password.set('Password123');
    fixture.componentInstance.confirmPassword.set('Password456');
    await fixture.componentInstance.onSubmit({ invalid: false, resetForm: vi.fn() } as never);

    expect(store.register).not.toHaveBeenCalled();
  });

  it('does not submit when a registration request is already in flight', async () => {
    const { store } = await configureTestingModule({ isSubmitting: true });
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.password.set('Password123');
    fixture.componentInstance.confirmPassword.set('Password123');
    await fixture.componentInstance.onSubmit({ invalid: false, resetForm: vi.fn() } as never);

    expect(store.register).not.toHaveBeenCalled();
  });

  it('delegates error dismissal to the store', async () => {
    const { store } = await configureTestingModule();
    const fixture = TestBed.createComponent(Register);

    fixture.componentInstance.clearError();

    expect(store.clearError).toHaveBeenCalledTimes(1);
  });
});
