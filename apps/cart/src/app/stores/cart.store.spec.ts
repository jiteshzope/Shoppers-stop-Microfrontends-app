import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { SESSION_COOKIE_NAMES } from '@ecommerce-mf/session';
import { CART_MESSAGES } from '../constants/cart-constants';
import { CartApiService } from '../services/cart-api.service';
import { CartShellBridgeService } from '../services/cart-shell-bridge.service';
import { CartStore } from './cart.store';

/** The readable CSRF cookie is the only client-visible trace of a session. */
const giveSessionCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=csrf-token; path=/`;
};

const clearSessionCookie = (): void => {
  document.cookie = `${SESSION_COOKIE_NAMES.CSRF}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

describe('CartStore', () => {
  let store: InstanceType<typeof CartStore>;
  let api: {
    getCartItems: ReturnType<typeof vi.fn>;
    addCartItem: ReturnType<typeof vi.fn>;
    removeCartItem: ReturnType<typeof vi.fn>;
  };
  let clearCartSubject: Subject<void>;
  let bridge: {
    clearCart$: Subject<void>;
    publishRemoteReady: ReturnType<typeof vi.fn>;
    publishCartUpdated: ReturnType<typeof vi.fn>;
    publishCartCleared: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    clearSessionCookie();
    clearCartSubject = new Subject<void>();
    api = {
      getCartItems: vi.fn(),
      addCartItem: vi.fn(),
      removeCartItem: vi.fn(),
    };
    bridge = {
      clearCart$: clearCartSubject,
      publishRemoteReady: vi.fn(),
      publishCartUpdated: vi.fn(),
      publishCartCleared: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CartStore,
        { provide: CartApiService, useValue: api },
        { provide: CartShellBridgeService, useValue: bridge },
      ],
    });

    store = TestBed.inject(CartStore) as InstanceType<typeof CartStore>;
  });

  afterEach(() => {
    clearSessionCookie();
    clearCartSubject.complete();
  });

  it('loads cart data when an authenticated session exists', async () => {
    giveSessionCookie();
    api.getCartItems.mockReturnValue(
      of([
        {
          id: 1,
          productId: 7,
          title: 'Desk Lamp',
          url: '/lamp.png',
          quantity: 2,
          price: 49.99,
          lineTotal: 99.98,
        },
      ]),
    );

    await store.loadData();

    expect(api.getCartItems).toHaveBeenCalledTimes(1);
    expect(store.data()).toHaveLength(1);
    expect(store.empty()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('keeps the cart empty when no auth session exists', async () => {
    await store.loadData();

    expect(api.getCartItems).not.toHaveBeenCalled();
    expect(store.data()).toEqual([]);
    expect(store.empty()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  it('surfaces load failures and publishes cart-cleared', async () => {
    giveSessionCookie();
    api.getCartItems.mockReturnValue(throwError(() => new Error('boom')));

    await store.loadData();

    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_LOAD);
    expect(store.data()).toEqual([]);
    expect(store.empty()).toBe(true);
    expect(bridge.publishCartCleared).toHaveBeenCalledTimes(1);
  });

  it('increases item quantity and publishes cart updates for newly added items', async () => {
    giveSessionCookie();
    api.addCartItem.mockReturnValue(
      of({
        id: 1,
        productId: 7,
        quantity: 1,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
      }),
    );

    await store.increaseItemQuantity(7);

    expect(api.addCartItem).toHaveBeenCalledWith({ productId: 7, quantity: 1 });
    expect(store.data()[0]).toMatchObject({ productId: 7, quantity: 1, lineTotal: 49.99 });
    expect(store.isItemMutating(7)).toBe(false);
    expect(bridge.publishCartUpdated).toHaveBeenCalledTimes(1);
  });

  it('decreases item quantity and removes the item when quantity reaches zero', async () => {
    giveSessionCookie();
    api.addCartItem.mockReturnValue(
      of({
        id: 1,
        productId: 7,
        quantity: 2,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
      }),
    );
    await store.increaseItemQuantity(7);

    api.removeCartItem.mockReturnValue(
      of({
        id: 1,
        productId: 7,
        quantity: 0,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
        removed: true,
      }),
    );

    await store.decreaseItemQuantity(7);

    expect(api.removeCartItem).toHaveBeenCalledWith({ productId: 7, quantity: 1 });
    expect(store.data()).toEqual([]);
    expect(store.empty()).toBe(true);
    expect(bridge.publishCartUpdated).toHaveBeenCalledTimes(1);
  });

  it('updates an existing item in place when increasing quantity without republishing cart-created state', async () => {
    giveSessionCookie();
    api.addCartItem.mockReturnValueOnce(
      of({
        id: 1,
        productId: 7,
        quantity: 1,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
      }),
    );
    await store.increaseItemQuantity(7);

    bridge.publishCartUpdated.mockClear();
    api.addCartItem.mockReturnValueOnce(
      of({
        productId: 7,
        quantity: 2,
      }),
    );

    await store.increaseItemQuantity(7);

    expect(store.data()).toEqual([
      expect.objectContaining({
        id: 1,
        productId: 7,
        quantity: 2,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
        lineTotal: 99.98,
      }),
    ]);
    expect(bridge.publishCartUpdated).not.toHaveBeenCalled();
  });

  it('updates an existing item in place when decreasing quantity above zero without publishing cart-cleared state', async () => {
    giveSessionCookie();
    api.addCartItem.mockReturnValueOnce(
      of({
        id: 1,
        productId: 7,
        quantity: 2,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
      }),
    );
    await store.increaseItemQuantity(7);

    bridge.publishCartUpdated.mockClear();
    api.removeCartItem.mockReturnValueOnce(
      of({
        productId: 7,
        quantity: 1,
      }),
    );

    await store.decreaseItemQuantity(7);

    expect(store.data()).toEqual([
      expect.objectContaining({
        id: 1,
        productId: 7,
        quantity: 1,
        title: 'Desk Lamp',
        url: '/lamp.png',
        price: 49.99,
        lineTotal: 49.99,
      }),
    ]);
    expect(bridge.publishCartUpdated).not.toHaveBeenCalled();
  });

  it('rejects invalid product ids and unauthenticated mutations', async () => {
    await store.increaseItemQuantity(0);
    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_LOAD);

    store.clearError();
    await store.decreaseItemQuantity(7);

    expect(api.removeCartItem).not.toHaveBeenCalled();
    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_LOAD);
    expect(store.empty()).toBe(true);
  });

  it('surfaces increase and decrease failures and always clears mutating state', async () => {
    giveSessionCookie();
    api.addCartItem.mockReturnValueOnce(throwError(() => new Error('boom')));

    await store.increaseItemQuantity(7);
    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_INCREASE_QUANTITY);
    expect(store.isItemMutating(7)).toBe(false);

    api.removeCartItem.mockReturnValueOnce(throwError(() => new Error('boom')));
    await store.decreaseItemQuantity(7);
    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_DECREASE_QUANTITY);
    expect(store.isItemMutating(7)).toBe(false);
  });

  it('initializes by publishing remote-ready and loading data', async () => {
    giveSessionCookie();
    api.getCartItems.mockReturnValue(of([]));

    store.initialize();
    await Promise.resolve();

    expect(bridge.publishRemoteReady).toHaveBeenCalledTimes(1);
    expect(api.getCartItems).toHaveBeenCalledTimes(1);
  });

  it('clears local cart state when shell requests a cart clear', () => {
    clearCartSubject.next();

    expect(store.data()).toEqual([]);
    expect(store.empty()).toBe(true);
    expect(store.error()).toBeNull();
    expect(bridge.publishCartCleared).toHaveBeenCalledTimes(1);
  });

  it('clears the current error message', async () => {
    await store.increaseItemQuantity(0);
    expect(store.error()).toBe(CART_MESSAGES.FAILED_TO_LOAD);

    store.clearError();

    expect(store.error()).toBeNull();
  });
});