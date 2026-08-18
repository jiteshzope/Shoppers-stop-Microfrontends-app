import { notFound } from '../../shared/http-error';
import * as repository from './catalog.repository';
import type { ProductDetails, ProductRow, ProductSummary } from './catalog.types';

function toSummary(row: ProductRow): ProductSummary {
  return {
    id: Number(row.id),
    title: row.title,
    price: Number(row.price),
    url: row.image_url,
  };
}

export async function listProducts(): Promise<ProductSummary[]> {
  return (await repository.findAllProducts()).map(toSummary);
}

export async function getProduct(productId: number): Promise<ProductDetails> {
  const row = await repository.findProductById(productId);
  if (!row) {
    throw notFound('PRODUCT_NOT_FOUND');
  }

  return { ...toSummary(row), description: row.description };
}
