import { TestBed } from '@angular/core/testing';
import { SESSION_API_BASE_URL } from '@ecommerce-mf/session';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { cartAuthGuard } from './cart-auth.guard';
import { AuthRemoteService } from '../services/auth-remote.service';

const configureTestingModule = (isAuthenticated: boolean, resolveSession: Promise<void>) => {
  TestBed.configureTestingModule({
    providers: [
        { provide: SESSION_API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        
      provideRouter([]),
      {
        provide: AuthRemoteService,
        useValue: {
          isAuthenticated: () => isAuthenticated,
          whenSessionResolved: () => resolveSession,
        },
      },
    ],
  });
};

describe('cartAuthGuard', () => {
  it('allows access for authenticated users', async () => {
    configureTestingModule(true, Promise.resolve());

    const result = await TestBed.runInInjectionContext(() => cartAuthGuard());

    expect(result).toBe(true);
  });

  it('redirects guests to the product page', async () => {
    configureTestingModule(false, Promise.resolve());

    const router = TestBed.inject(Router);
    const result = (await TestBed.runInInjectionContext(() => cartAuthGuard())) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/product');
  });

  it('waits for the session lookup before deciding', async () => {
    let resolveSession = (): void => undefined;
    const pendingSession = new Promise<void>((resolve) => {
      resolveSession = resolve;
    });
    let isAuthenticated = false;

    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        
        provideRouter([]),
        {
          provide: AuthRemoteService,
          useValue: {
            isAuthenticated: () => isAuthenticated,
            whenSessionResolved: () => pendingSession,
          },
        },
      ],
    });

    const guardResult = TestBed.runInInjectionContext(() => cartAuthGuard());

    // The session only becomes known after the API answers.
    isAuthenticated = true;
    resolveSession();

    expect(await guardResult).toBe(true);
  });
});
