import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('posts login credentials to the auth API', () => {
    service.login({ email: 'test@example.com', password: 'Password123' }).subscribe();

    const request = httpTesting.expectOne(`${environment.authApiBaseUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'test@example.com', password: 'Password123' });
    request.flush({});
  });

  it('posts register data to the auth API', () => {
    service
      .register({
        name: 'Taylor',
        email: 'test@example.com',
        phoneNumber: '+12345678901',
        password: 'Password123',
        confirmPassword: 'Password123',
      })
      .subscribe();

    const request = httpTesting.expectOne(`${environment.authApiBaseUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Taylor',
      email: 'test@example.com',
      phoneNumber: '+12345678901',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    request.flush({});
  });

  it('reads the current session from the auth API', () => {
    service.getSession().subscribe();

    const request = httpTesting.expectOne(`${environment.authApiBaseUrl}/auth/session`);
    expect(request.request.method).toBe('GET');
    request.flush({ user: { id: '1', name: 'Taylor', email: 'a@b.c', phoneNumber: '1' } });
  });
});