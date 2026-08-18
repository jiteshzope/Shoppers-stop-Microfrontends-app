import { parsePositiveInteger } from '../../shared/parse';
import type { CartMutationInput } from './cart.types';

const INVALID_PAYLOAD = 'INVALID_CART_ITEM_PAYLOAD';

export function parseCartMutationPayload(body: unknown): CartMutationInput {
  const payload = (body ?? {}) as Record<string, unknown>;
  const rawQuantity = payload['quantity'] ?? 1;

  return {
    productId: parsePositiveInteger(payload['productId'], INVALID_PAYLOAD),
    quantity: parsePositiveInteger(rawQuantity, INVALID_PAYLOAD),
  };
}
