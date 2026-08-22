import { expect, type Locator, type Page } from '@playwright/test';
import appContent from '../fixtures/app-content.json';

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ProductPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/product');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/product(?:\?|$)/);
    await expect(this.page.getByTestId('product-list-page')).toBeVisible();
    await expect(this.page.getByRole('heading', { level: 2, name: appContent.catalogHeading })).toBeVisible();
  }

  productCard(title: string): Locator {
    return this.page
      .locator('[data-testid^="product-card-"]')
      .filter({ has: this.page.getByRole('heading', { level: 3, name: title, exact: true }) });
  }

  async addFromList(title: string): Promise<void> {
    const card = this.productCard(title);

    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(card.getByText(/In cart:\s*1/)).toBeVisible();
  }

  async increaseFromList(title: string, expectedQuantity: number): Promise<void> {
    const card = this.productCard(title);

    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(card.getByText(new RegExp(String.raw`In cart:\s*${expectedQuantity}`))).toBeVisible();
  }

  async openDetails(title: string): Promise<void> {
    const card = this.productCard(title);

    await expect(card).toBeVisible();
    await card
      .getByRole('link', { name: new RegExp(`View details for ${escapeForRegex(title)}`) })
      .click();

    await expect(this.page).toHaveURL(/\/product\/[^/?#]+(?:\?|$)/);
    await expect(this.page.getByTestId('product-details-page')).toBeVisible();
    await expect(this.page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  }

  async addFromDetails(expectedQuantity: number): Promise<void> {
    await this.page.getByRole('button', { name: 'Increase quantity' }).click();
    await expect(this.page.locator('[data-testid^="product-details-card-"] .item-quantity')).toHaveText(
      String(expectedQuantity),
    );
  }
}