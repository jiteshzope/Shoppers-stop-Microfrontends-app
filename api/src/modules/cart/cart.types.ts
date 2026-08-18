export interface CartItemRow {
  id: string;
  product_id: string;
  quantity: number;
  title: string;
  image_url: string;
  price: string;
}

export interface CartItem {
  id: number;
  productId: number;
  title: string;
  url: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

/** Result of a quantity change; `removed` marks the item dropping out of the cart. */
export interface CartMutationResult {
  id?: number;
  productId: number;
  quantity: number;
  title?: string;
  url?: string;
  price?: number;
  removed?: boolean;
}

export interface CartMutationInput {
  productId: number;
  quantity: number;
}
