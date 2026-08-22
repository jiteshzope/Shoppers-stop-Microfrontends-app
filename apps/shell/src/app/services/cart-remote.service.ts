import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import {
  CART_SHELL_CHANNEL,
  CART_EVENT_TYPES,
  REMOTE_SOURCES,
  type CartToShellEvent,
  type ShellToCartEvent,
} from '@ecommerce-mf/session';
import { ShellStore } from '../stores/shell.store';

@Injectable({ providedIn: 'root' })
export class CartRemoteService {
  private readonly cartChannel = inject(CART_SHELL_CHANNEL, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly shellStore = inject(ShellStore) as InstanceType<typeof ShellStore>;

  constructor() {
    this.cartChannel?.events$
      .pipe(
        filter((event): event is CartToShellEvent => event.source === REMOTE_SOURCES.CART),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.handleCartEvent(event));
  }

  // ─── Receive events from cart remote ────────────────────────────────────────

  private handleCartEvent(event: CartToShellEvent): void {
    switch (event.type) {
      case CART_EVENT_TYPES.REMOTE_READY:
        console.log('[Shell ← Cart] Remote is ready');
        break;

      case CART_EVENT_TYPES.CART_UPDATED:
        if (this.shellStore.isAuthenticated()) {
          void this.shellStore.loadCartItemCount();
        } else {
          this.shellStore.setCartItemCount(0);
        }
        console.log('[Shell ← Cart] Cart updated; refreshed item count');
        break;

      case CART_EVENT_TYPES.CHECKOUT_INITIATED:
        console.log('[Shell ← Cart] Checkout initiated');
        break;

      case CART_EVENT_TYPES.CART_CLEARED:
        this.shellStore.setCartItemCount(0);
        console.log('[Shell ← Cart] Cart cleared');
        break;

      default:
        console.log('[Shell ← Cart] Unknown event type:', event.type);
    }
  }

  // ─── Send events to cart remote ─────────────────────────────────────────

  private publishToCart(event: Omit<ShellToCartEvent, 'source' | 'timestamp'>): void {
    this.cartChannel?.publish({
      ...event,
      source: REMOTE_SOURCES.SHELL,
      timestamp: Date.now(),
    });
  }

  /** Tells the cart remote to drop everything tied to the session that just ended. */
  sendSessionCleared(): void {
    this.publishToCart({
      type: CART_EVENT_TYPES.SESSION_CLEARED,
    });
  }
}
