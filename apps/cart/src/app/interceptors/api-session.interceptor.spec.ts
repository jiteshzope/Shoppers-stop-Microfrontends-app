import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAMES } from '@ecommerce-mf/session';
import { environment } from '../../environments/environment';
import { apiSessionInterceptor } from './api-session.interceptor';

const giveCsrfCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=csrf-token; path=/`;
};

const clearCsrfCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

describe('apiSessionInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    clearCsrfCookie();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    clearCsrfCookie();
  });

  it('sends credentials with API reads but no CSRF header', () => {
    giveCsrfCookie();

    http.get(`${environment.ecommerceApiBaseUrl}/cart`).subscribe();

    const request = httpTesting.expectOne(`${environment.ecommerceApiBaseUrl}/cart`);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has(CSRF_HEADER_NAME)).toBe(false);
    request.flush([]);
  });

  it('adds the CSRF header to state-changing API requests', () => {
    giveCsrfCookie();

    http.post(`${environment.ecommerceApiBaseUrl}/cart/items`, { productId: 1 }).subscribe();

    const request = httpTesting.expectOne(`${environment.ecommerceApiBaseUrl}/cart/items`);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get(CSRF_HEADER_NAME)).toBe('csrf-token');
    request.flush({});
  });

  it('omits the CSRF header when no session cookie is present', () => {
    http.post(`${environment.ecommerceApiBaseUrl}/cart/items`, { productId: 1 }).subscribe();

    const request = httpTesting.expectOne(`${environment.ecommerceApiBaseUrl}/cart/items`);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has(CSRF_HEADER_NAME)).toBe(false);
    request.flush({});
  });

  it('leaves non-API requests untouched', () => {
    giveCsrfCookie();

    http.post('/assets/ping', {}).subscribe();

    const request = httpTesting.expectOne('/assets/ping');
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has(CSRF_HEADER_NAME)).toBe(false);
    request.flush({});
  });
});
