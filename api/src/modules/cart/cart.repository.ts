import { pool } from '../../database/pool';
import type { CartItemRow } from './cart.types';

const CART_ITEM_COLUMNS = 'ci.id, ci.product_id, ci.quantity, p.title, p.image_url, p.price';

export async function findCartItems(userId: string): Promise<CartItemRow[]> {
  const result = await pool.query<CartItemRow>(
    `SELECT ${CART_ITEM_COLUMNS}
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at DESC`,
    [userId],
  );

  return result.rows;
}

export async function findCartItem(
  userId: string,
  productId: number,
): Promise<CartItemRow | null> {
  const result = await pool.query<CartItemRow>(
    `SELECT ${CART_ITEM_COLUMNS}
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1 AND ci.product_id = $2`,
    [userId, productId],
  );

  return result.rows[0] ?? null;
}

/** Adds the quantity to an existing line, or creates the line when absent. */
export async function upsertCartItem(
  userId: string,
  productId: number,
  quantity: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()`,
    [userId, productId, quantity],
  );
}

export async function updateCartItemQuantity(
  userId: string,
  productId: number,
  quantity: number,
): Promise<void> {
  await pool.query(
    `UPDATE cart_items
     SET quantity = $1, updated_at = NOW()
     WHERE user_id = $2 AND product_id = $3`,
    [quantity, userId, productId],
  );
}

export async function deleteCartItem(userId: string, productId: number): Promise<void> {
  await pool.query(`DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2`, [
    userId,
    productId,
  ]);
}
