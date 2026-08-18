export interface BaseEvent<TSource extends string> {
  source: TSource;
  type: string;
  timestamp: number;
}

export type AuthToShellEvent = BaseEvent<'auth'>;

export type CartToShellEvent = BaseEvent<'cart'>;

export type ProductToShellEvent = BaseEvent<'product'>;

// Shell -> Cart remote events
export type ShellToCartEvent = BaseEvent<'shell'>;

// Shell -> Product remote events
export type ShellToProductEvent = BaseEvent<'shell'>;

export type AuthChannelEvent = AuthToShellEvent;
export type CartChannelEvent = CartToShellEvent | ShellToCartEvent;
export type ProductChannelEvent = ProductToShellEvent | ShellToProductEvent;

export type AnyEvent =
  | AuthToShellEvent
  | CartToShellEvent
  | ProductToShellEvent
  | ShellToCartEvent
  | ShellToProductEvent;
