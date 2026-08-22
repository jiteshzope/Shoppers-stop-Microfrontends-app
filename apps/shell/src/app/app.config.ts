import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  AUTH_SHELL_CHANNEL,
  CART_SHELL_CHANNEL,
  PRODUCT_SHELL_CHANNEL,
  SESSION_API_BASE_URL,
  apiSessionInterceptor,
  type AuthChannelEvent,
  type CartChannelEvent,
  type ProductChannelEvent,
} from '@ecommerce-mf/session';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';
import { ShellRemoteChannelService } from './services/shell-remote-channel.service';

const authShellChannel = new ShellRemoteChannelService<AuthChannelEvent>();
const cartShellChannel = new ShellRemoteChannelService<CartChannelEvent>();
const productShellChannel = new ShellRemoteChannelService<ProductChannelEvent>();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiSessionInterceptor])),
    provideRouter(appRoutes),
    // The federated remotes resolve services against this injector, so the
    // shell's base URL and interceptor cover every API call the page makes.
    { provide: SESSION_API_BASE_URL, useValue: environment.ecommerceApiBaseUrl },
    { provide: AUTH_SHELL_CHANNEL, useValue: authShellChannel },
    { provide: CART_SHELL_CHANNEL, useValue: cartShellChannel },
    { provide: PRODUCT_SHELL_CHANNEL, useValue: productShellChannel },
  ],
};
