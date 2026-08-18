import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import {
  CART_SHELL_CHANNEL,
  CART_EVENT_TYPES,
  REMOTE_SOURCES,
  type CartToShellEvent,
  type ShellToCartEvent,
} from '@ecommerce-mf/session';

@Injectable({ providedIn: 'root' })
export class CartShellBridgeService {
  private readonly cartChannel = inject(CART_SHELL_CHANNEL, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly clearCartSubject = new Subject<void>();
  readonly clearCart$ = this.clearCartSubject.asObservable();

  constructor() {
    // Subscribe to events arriving from the shell
    this.cartChannel?.events$
      .pipe(
        filter((event): event is ShellToCartEvent => event.source === REMOTE_SOURCES.SHELL),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.handleShellEvent(event));
  }

  // ─── Receive events from shell ───────────────────────────────────────────────

  private handleShellEvent(event: ShellToCartEvent): void {
    switch (event.type) {

      case CART_EVENT_TYPES.CLEAR_CART:
        this.clearCartSubject.next();
        console.log('[Cart ← Shell] Clear cart');
        break;


      case CART_EVENT_TYPES.SYNC_CART:
        console.log('[Cart ← Shell] Sync cart with server');
        break;

      default:
        console.log('[Cart ← Shell] Unknown event type:', event.type);
    }
  }

  // ─── Send events to shell ────────────────────────────────────────────────────

  private publish(event: Omit<CartToShellEvent, 'source' | 'timestamp'>): void {
    this.cartChannel?.publish({
      ...event,
      source: REMOTE_SOURCES.CART,
      timestamp: Date.now(),
    });
  }

  publishRemoteReady(): void {
    this.publish({
      type: 'remote-ready',
    });
  }

  publishCartUpdated(): void {
    this.publish({
      type: 'cart-updated',
    });
  }

  publishCheckoutInitiated(): void {
    this.publish({
      type: 'checkout-initiated',
    });
  }

  publishCartCleared(): void {
    this.publish({
      type: 'cart-cleared',
    });
  }
}
