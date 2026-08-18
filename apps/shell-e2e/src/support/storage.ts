import type { Page } from '@playwright/test';

/**
 * Starts each spec from a signed-out browser.
 *
 * The session lives entirely in cookies set by the API — nothing is kept in
 * localStorage — so clearing cookies is what actually ends the session; the
 * storage sweep only guards against leftovers from earlier builds.
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
