import { DestroyRef, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { hasSessionHint } from '@ecommerce-mf/session';
import {
  ProductApiService,
  type AddToCartApiResponse,
  type CartApiItem,
  type ProductApiItem,
  type ProductDetailsApiItem,
} from '../services/product-api.service';
import { ProductShellBridgeService } from '../services/product-shell-bridge.service';
import { PRODUCT_MESSAGES } from '../constants/product-constants';

interface ProductState {
  products: ProductApiItem[];
  selectedProduct: ProductDetailsApiItem | null;
  listLoading: boolean;
  detailsLoading: boolean;
  addToCartLoadingIds: string[];
  cartQuantities: Record<string, number>;
  listError: string | null;
  detailsError: string | null;
  addToCartError: string | null;
  empty: boolean;
}

const initialState: ProductState = {
  products: [],
  selectedProduct: null,
  listLoading: false,
  detailsLoading: false,
  addToCartLoadingIds: [],
  cartQuantities: {},
  listError: null,
  detailsError: null,
  addToCartError: null,
  empty: true,
};

export const ProductStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((
    store,
    api = inject(ProductApiService),
    bridge = inject(ProductShellBridgeService),
    router = inject(Router),
    destroyRef = inject(DestroyRef),
  ) => {
    const readErrorCode = (error: unknown): string | null => {
      if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
        const payload = error.error as { message?: unknown };
        return typeof payload.message === 'string' ? payload.message : null;
      }

      if (error instanceof Error) {
        return error.message;
      }

      return null;
    };

    const loadProducts = async (): Promise<void> => {
      patchState(store, {
        listLoading: true,
        listError: null,
        addToCartError: null,
      });

      try {
        const products = await firstValueFrom(api.getProducts());
        patchState(store, {
          products,
          listLoading: false,
          empty: products.length === 0,
        });
      } catch {
        patchState(store, {
          listLoading: false,
          listError: PRODUCT_MESSAGES.FAILED_TO_LOAD_LIST,
          products: [],
          empty: true,
        });
      }

      await loadCartQuantities();
    };

    const loadProductDetails = async (productId: string): Promise<void> => {
      patchState(store, {
        detailsLoading: true,
        detailsError: null,
        addToCartError: null,
      });

      try {
        const selectedProduct = await firstValueFrom(api.getProductById(productId));
        patchState(store, {
          selectedProduct,
          detailsLoading: false,
        });

        await loadCartQuantities();
      } catch (error) {
        const errorCode = readErrorCode(error);
        patchState(store, {
          detailsLoading: false,
          selectedProduct: null,
          detailsError:
            errorCode === 'PRODUCT_NOT_FOUND'
              ? PRODUCT_MESSAGES.PRODUCT_NOT_FOUND
              : PRODUCT_MESSAGES.FAILED_TO_LOAD_DETAILS,
        });
      }
    };

    const withAddToCartLoading = (productId: string, active: boolean): void => {
      const current = store.addToCartLoadingIds();
      const next = active
        ? [...new Set([...current, productId])]
        : current.filter((id) => id !== productId);
      patchState(store, { addToCartLoadingIds: next });
    };

    const toQuantityMap = (items: CartApiItem[]): Record<string, number> => {
      return items.reduce<Record<string, number>>((acc, item) => {
        acc[String(item.productId)] = item.quantity;
        return acc;
      }, {});
    };

    const loadCartQuantities = async (): Promise<void> => {
      if (!hasSessionHint()) {
        patchState(store, { cartQuantities: {} });
        return;
      }

      try {
        const cartItems = await firstValueFrom(api.getCartItems());
        patchState(store, { cartQuantities: toQuantityMap(cartItems) });
      } catch {
        patchState(store, { cartQuantities: {} });
      }
    };

    const mutateCartQuantity = async (
      productId: string,
      mode: 'increase' | 'decrease',
      quantity = 1,
    ): Promise<AddToCartApiResponse | null> => {
      patchState(store, {
        addToCartError: null,
      });

      if (!hasSessionHint()) {
        void router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
        return null;
      }

      if (mode === 'decrease' && (store.cartQuantities()[productId] ?? 0) <= 0) {
        return null;
      }

      withAddToCartLoading(productId, true);

      try {
        const response = await firstValueFrom(
          mode === 'increase'
            ? api.addToCart({ productId, quantity })
            : api.removeFromCart({ productId, quantity }),
        );

        const nextQuantity = response.quantity;
        const shouldPublishCartUpdated =
          (mode === 'increase' && nextQuantity === 1) ||
          (mode === 'decrease' && (nextQuantity <= 0 || response.removed));

        patchState(store, {
          cartQuantities: {
            ...store.cartQuantities(),
            [productId]: nextQuantity,
          },
        });

        if (nextQuantity <= 0) {
          const nextMap = { ...store.cartQuantities() };
          delete nextMap[productId];
          patchState(store, { cartQuantities: nextMap });
        }

        if (shouldPublishCartUpdated) {
          bridge.publishCartUpdated();
        }
        return response;
      } catch {
        patchState(store, {
          addToCartError:
            mode === 'increase'
              ? PRODUCT_MESSAGES.FAILED_TO_ADD_TO_CART
              : PRODUCT_MESSAGES.FAILED_TO_REMOVE_FROM_CART,
        });
        return null;
      } finally {
        withAddToCartLoading(productId, false);
      }
    };

    const addToCart = async (productId: string, quantity = 1): Promise<AddToCartApiResponse | null> => {
      return mutateCartQuantity(productId, 'increase', quantity);
    };

    // Quantities belong to the shopper, not the catalogue, so they have to go
    // when the session does. Logging out from /product leaves the route
    // unchanged, so nothing here is re-created and the counts would otherwise
    // stay on screen for the next visitor.
    bridge.sessionCleared$.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      patchState(store, {
        cartQuantities: {},
        addToCartLoadingIds: [],
        addToCartError: null,
      });
    });

    return {
      loadProducts,
      loadProductDetails,
      addToCart,

      increaseItemQuantity(productId: string, quantity = 1): Promise<AddToCartApiResponse | null> {
        return mutateCartQuantity(productId, 'increase', quantity);
      },

      decreaseItemQuantity(productId: string, quantity = 1): Promise<AddToCartApiResponse | null> {
        return mutateCartQuantity(productId, 'decrease', quantity);
      },

      isAddToCartLoading(productId: string): boolean {
        return store.addToCartLoadingIds().includes(productId);
      },

      getItemQuantity(productId: string): number {
        return store.cartQuantities()[productId] ?? 0;
      },

      initialize(): void {
        bridge.publishRemoteReady();
        void loadCartQuantities();
      },

      clearListError(): void {
        patchState(store, { listError: null });
      },

      clearDetailsError(): void {
        patchState(store, { detailsError: null });
      },

      clearAddToCartError(): void {
        patchState(store, {
          addToCartError: null,
        });
      },

      clearSelectedProduct(): void {
        patchState(store, {
          selectedProduct: null,
          detailsError: null,
        });
      },
    };
  }),
);
