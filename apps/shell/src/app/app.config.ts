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
  type AuthChannelEvent,
  type CartChannelEvent,
  type ProductChannelEvent,
} from '@ecommerce-mf/session';
import { appRoutes } from './app.routes';
import { apiSessionInterceptor } from './interceptors/api-session.interceptor';
import { ShellRemoteChannelService } from './services/shell-remote-channel.service';

const authShellChannel = new ShellRemoteChannelService<AuthChannelEvent>();
const cartShellChannel = new ShellRemoteChannelService<CartChannelEvent>();
const productShellChannel = new ShellRemoteChannelService<ProductChannelEvent>();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiSessionInterceptor])),
    provideRouter(appRoutes),
    { provide: AUTH_SHELL_CHANNEL, useValue: authShellChannel },
    { provide: CART_SHELL_CHANNEL, useValue: cartShellChannel },
    { provide: PRODUCT_SHELL_CHANNEL, useValue: productShellChannel },
  ],
};
