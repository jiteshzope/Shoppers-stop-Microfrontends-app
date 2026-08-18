import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthRemoteService } from '../services/auth-remote.service';

/**
 * Keeps the cart route to signed-in shoppers.
 *
 * The session lives in an httpOnly cookie, so on a cold page load the app only
 * learns who the visitor is once the API has answered. The guard waits for that
 * lookup instead of deciding on a not-yet-known session and bouncing a signed-in
 * shopper back to the catalog.
 */
export const cartAuthGuard: CanMatchFn = async (): Promise<boolean | UrlTree> => {
  const authRemote = inject(AuthRemoteService);
  const router = inject(Router);

  await authRemote.whenSessionResolved();

  return authRemote.isAuthenticated() ? true : router.createUrlTree(['/product']);
};
