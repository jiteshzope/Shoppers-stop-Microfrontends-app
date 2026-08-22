import { expect, test } from '@playwright/test';
import { AuthPage } from './page-objects/auth.page';
import { ProductPage } from './page-objects/product.page';
import { ShellHeaderPage } from './page-objects/shell-header.page';
import { clearBrowserState } from './support/storage';
import { buildTestUser } from './support/test-user';

/**
 * Guards the seam between the storefront and the API's bearer-token auth.
 *
 * Every failure here looked the same from the outside: the sign-in itself
 * worked, and everything downstream of it behaved as though it had not — the
 * header kept its Login/Register buttons, and a cart write bounced to the login
 * page. Registering is covered in auth-flow.spec.ts; this covers signing back
 * in, staying signed in, and the writes that depend on it.
 */
test.describe('session continuity', () => {
  test.beforeEach(async ({ page }) => {
    await clearBrowserState(page);
  });

  test('keeps a logged-in shopper signed in across writes and reloads', async ({ page }) => {
    const authPage = new AuthPage(page);
    const productPage = new ProductPage(page);
    const shellHeader = new ShellHeaderPage(page);
    const user = buildTestUser('session');

    await test.step('register, then sign out to get a returning shopper', async () => {
      await authPage.gotoRegister();
      await authPage.register(user);

      await shellHeader.expectSignedIn(user.email);
      await shellHeader.logout();
      await shellHeader.expectLoggedOut();
    });

    await test.step('logging back in updates the header, not just the route', async () => {
      await authPage.gotoLogin();
      await authPage.login(user);

      // The reported bug: the app navigated away from /auth/login while the
      // header still offered Login and Register.
      await shellHeader.expectSignedIn(user.email);
      await expect(page.getByTestId('login-button')).toHaveCount(0);
      await expect(page.getByTestId('cart-link')).toBeVisible();
    });

    await test.step('changing a quantity writes to the cart instead of bouncing to login', async () => {
      await productPage.goto();
      await productPage.addFromList('Nordic Ceramic Mug');

      await expect(page).toHaveURL(/\/product(?:\?|$)/);
      await shellHeader.expectCartCount(1);
    });

    await test.step('a full reload restores the session from the stored refresh token', async () => {
      await page.reload();

      await productPage.expectLoaded();
      await shellHeader.expectSignedIn(user.email);
      await shellHeader.expectCartCount(1);
    });

    await test.step('an expired access token is refreshed rather than surfaced', async () => {
      // Drop only the in-memory access token, which is what expiry looks like
      // to the app. The next call 401s, the interceptor refreshes, and the
      // shopper never sees it.
      await page.evaluate(() => {
        const holder = (globalThis as unknown as Record<string, { value: string | null }>)[
          '__ecommerceMfAccessToken__'
        ];
        if (holder) {
          holder.value = 'expired.access.token';
        }
      });

      await productPage.increaseFromList('Nordic Ceramic Mug', 2);

      await expect(page).toHaveURL(/\/product(?:\?|$)/);
      await shellHeader.expectSignedIn(user.email);
    });
  });
});
