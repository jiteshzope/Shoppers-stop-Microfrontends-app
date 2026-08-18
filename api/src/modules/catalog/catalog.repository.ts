import { pool } from '../../database/pool';
import type { ProductRow } from './catalog.types';

const PRODUCT_COLUMNS = 'id, title, description, price, image_url';

export async function findAllProducts(): Promise<ProductRow[]> {
  const result = await pool.query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY id ASC`,
  );

  return result.rows;
}

export async function findProductById(productId: number): Promise<ProductRow | null> {
  const result = await pool.query<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = $1`,
    [productId],
  );

  return result.rows[0] ?? null;
}

export async function productExists(productId: number): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM products WHERE id = $1`, [productId]);
  return result.rowCount !== null && result.rowCount > 0;
}
