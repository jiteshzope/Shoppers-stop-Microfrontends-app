/**
 * Remote sources
 */
export const REMOTE_SOURCES = {
  AUTH: 'auth',
  CART: 'cart',
  PRODUCT: 'product',
  SHELL: 'shell',
} as const;

/**
 * Auth remote ← → Shell event types
 * Shell only receives events from the auth remote; it no longer sends navigation
 * or logout events — routing is handled directly via the Angular Router.
 */
export const AUTH_EVENT_TYPES = {
  // Auth remote → Shell
  REMOTE_READY: 'remote-ready',
  LOGIN_SUCCESS: 'login-success',
  LOGIN_FAILED: 'login-failed',
  LOGOUT: 'logout',
  REGISTER_SUCCESS: 'register-success',
} as const;

/**
 * Cart remote ← → Shell event types
 */
export const CART_EVENT_TYPES = {
  // Remote → Shell
  REMOTE_READY: 'remote-ready',
  CART_UPDATED: 'cart-updated',
  CHECKOUT_INITIATED: 'checkout-initiated',
  CART_CLEARED: 'cart-cleared',

  // Shell → Remote
  ADD_ITEM: 'add-item',
  REMOVE_ITEM: 'remove-item',
  CLEAR_CART: 'clear-cart',
  SYNC_CART: 'sync-cart',
} as const;

/**
 * Product remote ← → Shell event types
 */
export const PRODUCT_EVENT_TYPES = {
  // Remote → Shell
  REMOTE_READY: 'remote-ready',
  CART_UPDATED: 'cart-updated',

  // Shell → Remote
  LOAD_PRODUCT: 'load-product',
  CLEAR_SELECTION: 'clear-selection',
  FILTER_BY_CATEGORY: 'filter-by-category',
} as const;
