import { notFound } from '../../shared/http-error';
import * as catalogRepository from '../catalog/catalog.repository';
import * as repository from './cart.repository';
import type { CartItem, CartItemRow, CartMutationInput, CartMutationResult } from './cart.types';

function toCartItem(row: CartItemRow): CartItem {
  const price = Number(row.price);

  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    title: row.title,
    url: row.image_url,
    quantity: row.quantity,
    price,
    lineTotal: price * row.quantity,
  };
}

function toMutationResult(row: CartItemRow): CartMutationResult {
  const item = toCartItem(row);

  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    title: item.title,
    url: item.url,
    price: item.price,
  };
}

export async function listCartItems(userId: string): Promise<CartItem[]> {
  return (await repository.findCartItems(userId)).map(toCartItem);
}

export async function addCartItem(
  userId: string,
  { productId, quantity }: CartMutationInput,
): Promise<CartMutationResult> {
  if (!(await catalogRepository.productExists(productId))) {
    throw notFound('PRODUCT_NOT_FOUND');
  }

  await repository.upsertCartItem(userId, productId, quantity);

  const row = await repository.findCartItem(userId, productId);
  if (!row) {
    throw notFound('CART_ITEM_NOT_FOUND');
  }

  return toMutationResult(row);
}

export async function removeCartItem(
  userId: string,
  { productId, quantity }: CartMutationInput,
): Promise<CartMutationResult> {
  const existing = await repository.findCartItem(userId, productId);
  if (!existing) {
    throw notFound('CART_ITEM_NOT_FOUND');
  }

  const nextQuantity = existing.quantity - quantity;

  if (nextQuantity <= 0) {
    await repository.deleteCartItem(userId, productId);
    return { productId, quantity: 0, removed: true };
  }

  await repository.updateCartItemQuantity(userId, productId, nextQuantity);
  return toMutationResult({ ...existing, quantity: nextQuantity });
}
