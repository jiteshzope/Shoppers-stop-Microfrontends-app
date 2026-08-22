import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { SESSION_API_BASE_URL, REFRESH_TOKEN_STORAGE_KEY } from '@ecommerce-mf/session';
import { PRODUCT_MESSAGES } from '../constants/product-constants';
import { ProductApiService } from '../services/product-api.service';
import { ProductShellBridgeService } from '../services/product-shell-bridge.service';
import { ProductStore } from './product.store';

/** A stored refresh token is the client-visible trace of a session. */
const giveStoredSession = (): void => {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, 'stored-refresh-token');
};

const clearStoredSession = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

describe('ProductStore', () => {
  let store: InstanceType<typeof ProductStore>;
  let api: {
    getProducts: ReturnType<typeof vi.fn>;
    getProductById: ReturnType<typeof vi.fn>;
    getCartItems: ReturnType<typeof vi.fn>;
    addToCart: ReturnType<typeof vi.fn>;
    removeFromCart: ReturnType<typeof vi.fn>;
  };
  let bridge: {
    publishRemoteReady: ReturnType<typeof vi.fn>;
    publishCartUpdated: ReturnType<typeof vi.fn>;
    sessionCleared$: Subject<void>;
  };
  let sessionCleared: Subject<void>;
  let router: {
    navigate: ReturnType<typeof vi.fn>;
    url: string;
  };

  beforeEach(() => {
    clearStoredSession();
    api = {
      getProducts: vi.fn(),
      getProductById: vi.fn(),
      getCartItems: vi.fn(),
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
    };
    sessionCleared = new Subject<void>();
    bridge = {
      publishRemoteReady: vi.fn(),
      publishCartUpdated: vi.fn(),
      sessionCleared$: sessionCleared,
    };
    router = {
      navigate: vi.fn().mockResolvedValue(true),
      url: '/product/7',
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_API_BASE_URL, useValue: 'http://localhost:3000/api/v1' },
        
        ProductStore,
        { provide: ProductApiService, useValue: api },
        { provide: ProductShellBridgeService, useValue: bridge },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(ProductStore) as InstanceType<typeof ProductStore>;
  });

  afterEach(() => {
    clearStoredSession();
  });

  it('loads products and cart quantities successfully', async () => {
    giveStoredSession();
    api.getProducts.mockReturnValue(
      of([{ id: 7, title: 'Desk Lamp', url: '/lamp.png', price: 49.99 }]),
    );
    api.getCartItems.mockReturnValue(
      of([{ id: 1, productId: 7, title: 'Desk Lamp', url: '/lamp.png', quantity: 2, price: 49.99, lineTotal: 99.98 }]),
    );

    await store.loadProducts();

    expect(store.products()).toHaveLength(1);
    expect(store.empty()).toBe(false);
    expect(store.getItemQuantity('7')).toBe(2);
    expect(store.listError()).toBeNull();
  });

  it('surfaces a catalog load failure and keeps the list empty', async () => {
    api.getProducts.mockReturnValue(throwError(() => new Error('boom')));

    await store.loadProducts();

    expect(store.products()).toEqual([]);
    expect(store.listError()).toBe(PRODUCT_MESSAGES.FAILED_TO_LOAD_LIST);
    expect(store.empty()).toBe(true);
  });

  it('loads product details and related cart quantities', async () => {
    giveStoredSession();
    api.getProductById.mockReturnValue(
      of({ id: 7, title: 'Desk Lamp', url: '/lamp.png', price: 49.99, description: 'Warm ambient lamp' }),
    );
    api.getCartItems.mockReturnValue(of([{ id: 1, productId: 7, title: 'Desk Lamp', url: '/lamp.png', quantity: 3, price: 49.99, lineTotal: 149.97 }]));

    await store.loadProductDetails('7');

    expect(store.selectedProduct()?.id).toBe(7);
    expect(store.getItemQuantity('7')).toBe(3);
    expect(store.detailsError()).toBeNull();
  });

  it('maps not found and generic detail errors correctly', async () => {
    api.getProductById.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'PRODUCT_NOT_FOUND' } })),
    );

    await store.loadProductDetails('404');

    expect(store.detailsError()).toBe(PRODUCT_MESSAGES.PRODUCT_NOT_FOUND);

    api.getProductById.mockReturnValueOnce(throwError(() => new Error('boom')));
    await store.loadProductDetails('500');

    expect(store.detailsError()).toBe(PRODUCT_MESSAGES.FAILED_TO_LOAD_DETAILS);
    expect(store.selectedProduct()).toBeNull();
  });

  it('redirects guests to login before mutating the cart', async () => {
    const result = await store.addToCart('7', 1);

    expect(result).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/product/7' },
    });
    expect(api.addToCart).not.toHaveBeenCalled();
  });

  it('adds to cart, tracks loading state, and publishes cart updates for a new item', async () => {
    giveStoredSession();
    api.addToCart.mockReturnValue(
      of({ id: '1', productId: '7', quantity: 1, title: 'Desk Lamp', url: '/lamp.png', price: 49.99 }),
    );

    const result = await store.addToCart('7', 1);

    expect(result?.quantity).toBe(1);
    expect(api.addToCart).toHaveBeenCalledWith({ productId: '7', quantity: 1 });
    expect(store.getItemQuantity('7')).toBe(1);
    expect(store.isAddToCartLoading('7')).toBe(false);
    expect(bridge.publishCartUpdated).toHaveBeenCalledTimes(1);
  });

  it('removes from cart, deletes empty quantities, and publishes cart updates when cleared', async () => {
    giveStoredSession();
    api.addToCart.mockReturnValue(
      of({ id: '1', productId: '7', quantity: 2, title: 'Desk Lamp', url: '/lamp.png', price: 49.99 }),
    );
    await store.addToCart('7', 2);

    api.removeFromCart.mockReturnValue(
      of({ id: '1', productId: '7', quantity: 0, title: 'Desk Lamp', url: '/lamp.png', price: 49.99, removed: true }),
    );

    const result = await store.decreaseItemQuantity('7', 1);

    expect(result?.quantity).toBe(0);
    expect(api.removeFromCart).toHaveBeenCalledWith({ productId: '7', quantity: 1 });
    expect(store.getItemQuantity('7')).toBe(0);
    expect(bridge.publishCartUpdated).toHaveBeenCalledTimes(1);
  });

  it('does not attempt to decrease items below zero', async () => {
    giveStoredSession();

    const result = await store.decreaseItemQuantity('7', 1);

    expect(result).toBeNull();
    expect(api.removeFromCart).not.toHaveBeenCalled();
  });

  it('surfaces add and remove cart failures', async () => {
    giveStoredSession();
    api.addToCart.mockReturnValueOnce(throwError(() => new Error('boom')));

    await store.addToCart('7', 1);
    expect(store.addToCartError()).toBe(PRODUCT_MESSAGES.FAILED_TO_ADD_TO_CART);

    api.addToCart.mockReturnValueOnce(
      of({ id: '1', productId: '7', quantity: 1, title: 'Desk Lamp', url: '/lamp.png', price: 49.99 }),
    );
    await store.addToCart('7', 1);

    api.removeFromCart.mockReturnValueOnce(throwError(() => new Error('boom')));
    await store.decreaseItemQuantity('7', 1);

    expect(store.addToCartError()).toBe(PRODUCT_MESSAGES.FAILED_TO_REMOVE_FROM_CART);
    expect(store.isAddToCartLoading('7')).toBe(false);
  });

  it('initializes the remote bridge and refreshes cart quantities for authenticated users', async () => {
    giveStoredSession();
    api.getCartItems.mockReturnValue(of([{ id: 1, productId: 7, title: 'Desk Lamp', url: '/lamp.png', quantity: 4, price: 49.99, lineTotal: 199.96 }]));

    store.initialize();
    await Promise.resolve();

    expect(bridge.publishRemoteReady).toHaveBeenCalledTimes(1);
    expect(api.getCartItems).toHaveBeenCalledTimes(1);
    expect(store.getItemQuantity('7')).toBe(4);
  });

  it('drops the cart quantities when the shell reports a sign-out', async () => {
    giveStoredSession();
    api.getCartItems.mockReturnValue(of([{ productId: 7, quantity: 4 }]));
    store.initialize();
    await Promise.resolve();

    expect(store.getItemQuantity('7')).toBe(4);

    // Logging out from /product does not change the route, so nothing here is
    // re-created; the counts belong to the shopper and have to go with them.
    sessionCleared.next();

    expect(store.getItemQuantity('7')).toBe(0);
    expect(store.cartQuantities()).toEqual({});
    expect(store.addToCartError()).toBeNull();
  });

  it('exposes clear helpers for list, details, cart error, and selected product', () => {
    store.clearListError();
    store.clearDetailsError();
    store.clearAddToCartError();
    store.clearSelectedProduct();

    expect(store.listError()).toBeNull();
    expect(store.detailsError()).toBeNull();
    expect(store.addToCartError()).toBeNull();
    expect(store.selectedProduct()).toBeNull();
  });
});