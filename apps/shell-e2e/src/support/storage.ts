import type { Page } from '@playwright/test';

/**
 * Starts each spec from a signed-out browser.
 *
 * The refresh token is kept in localStorage (and mirrored into an httpOnly
 * cookie), so both have to go for the next spec to start as a guest.
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
