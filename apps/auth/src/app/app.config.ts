import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SESSION_API_BASE_URL, apiSessionInterceptor } from '@ecommerce-mf/session';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiSessionInterceptor])),
    provideRouter(appRoutes),
    { provide: SESSION_API_BASE_URL, useValue: environment.authApiBaseUrl },
  ],
};
