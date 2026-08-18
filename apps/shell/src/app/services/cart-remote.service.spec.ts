import { TestBed } from '@angular/core/testing';
import {
  CART_EVENT_TYPES,
  CART_SHELL_CHANNEL,
  REMOTE_SOURCES,
  type CartChannelEvent,
} from '@ecommerce-mf/session';
import { ShellStore } from '../stores/shell.store';
import { CartRemoteService } from './cart-remote.service';
import { ShellRemoteChannelService } from './shell-remote-channel.service';

const publishCartEvent = (
  channel: ShellRemoteChannelService<CartChannelEvent>,
  type: string,
  source = REMOTE_SOURCES.CART,
) => {
  channel.publish({
    source,
    type,
    timestamp: Date.now(),
  });
};

describe('CartRemoteService', () => {
  let channel: ShellRemoteChannelService<CartChannelEvent>;
  let store: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    loadCartItemCount: ReturnType<typeof vi.fn>;
    setCartItemCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    channel = new ShellRemoteChannelService<CartChannelEvent>();
    store = {
      isAuthenticated: vi.fn(() => true),
      loadCartItemCount: vi.fn().mockResolvedValue(undefined),
      setCartItemCount: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CART_SHELL_CHANNEL, useValue: channel },
        { provide: ShellStore, useValue: store },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes cart count on cart updates for authenticated users', () => {
    TestBed.inject(CartRemoteService);

    publishCartEvent(channel, CART_EVENT_TYPES.CART_UPDATED);

    expect(store.loadCartItemCount).toHaveBeenCalledTimes(1);
    expect(store.setCartItemCount).not.toHaveBeenCalled();
  });

  it('resets cart count on cart updates for guests and on cart cleared', () => {
    TestBed.inject(CartRemoteService);
    store.isAuthenticated.mockReturnValue(false);

    publishCartEvent(channel, CART_EVENT_TYPES.CART_UPDATED);
    publishCartEvent(channel, CART_EVENT_TYPES.CART_CLEARED);

    expect(store.setCartItemCount).toHaveBeenCalledTimes(2);
    expect(store.setCartItemCount).toHaveBeenNthCalledWith(1, 0);
    expect(store.setCartItemCount).toHaveBeenNthCalledWith(2, 0);
  });

  it('ignores events not emitted by the cart remote', () => {
    TestBed.inject(CartRemoteService);

    publishCartEvent(channel, CART_EVENT_TYPES.CART_UPDATED, REMOTE_SOURCES.SHELL);

    expect(store.loadCartItemCount).not.toHaveBeenCalled();
    expect(store.setCartItemCount).not.toHaveBeenCalled();
  });

  it('handles non-mutating cart events without touching shell state', () => {
    TestBed.inject(CartRemoteService);

    publishCartEvent(channel, CART_EVENT_TYPES.REMOTE_READY);
    publishCartEvent(channel, CART_EVENT_TYPES.CHECKOUT_INITIATED);
    publishCartEvent(channel, 'unexpected-event');

    expect(store.loadCartItemCount).not.toHaveBeenCalled();
    expect(store.setCartItemCount).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });

});