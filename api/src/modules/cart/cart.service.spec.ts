import { NotFoundException } from '@nestjs/common';
import { Prisma, type CartItem, type Product } from '@prisma/client';
import { CartService } from './cart.service';
import type { PrismaService } from '../../prisma/prisma.service';

const USER_ID = 'e6b0c1a2-0000-4000-8000-000000000001';

const PRODUCT = {
  id: 2,
  slug: 'nordic-ceramic-mug',
  title: 'Nordic Ceramic Mug',
  description: 'Stoneware mug.',
  price: new Prisma.Decimal('18.50'),
  imageUrl: 'https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

type CartItemFixture = CartItem & { product: Product };

function cartItem(quantity: number): CartItemFixture {
  return {
    id: 1,
    userId: USER_ID,
    productId: PRODUCT.id,
    quantity,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: PRODUCT,
  };
}

describe('CartService', () => {
  let prisma: {
    cartItem: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let cart: CartService;

  beforeEach(() => {
    prisma = {
      cartItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: { findUnique: jest.fn() },
      // The service hands the transaction a client; the mock just replays
      // itself so the same stubs answer inside and outside the transaction.
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };

    cart = new CartService(prisma as unknown as PrismaService);
  });

  describe('listCartItems', () => {
    it('returns a line total alongside the unit price', async () => {
      prisma.cartItem.findMany.mockResolvedValue([cartItem(3)]);

      const [item] = await cart.listCartItems(USER_ID);

      expect(item.price).toBe(18.5);
      expect(item.lineTotal).toBe(55.5);
      expect(item.url).toBe('https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg');
    });
  });

  describe('addCartItem', () => {
    it('increments an existing line rather than replacing its quantity', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PRODUCT.id });
      prisma.cartItem.upsert.mockResolvedValue(cartItem(5));

      const result = await cart.addCartItem(USER_ID, { productId: PRODUCT.id, quantity: 2 });

      const [upsertArgs] = prisma.cartItem.upsert.mock.calls[0] as [
        { update: { quantity: { increment: number } }; create: { quantity: number } },
      ];

      expect(upsertArgs.update.quantity).toEqual({ increment: 2 });
      expect(upsertArgs.create.quantity).toBe(2);
      expect(result.quantity).toBe(5);
    });

    it('refuses a product that is not in the catalogue', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        cart.addCartItem(USER_ID, { productId: 9999, quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.cartItem.upsert).not.toHaveBeenCalled();
    });
  });

  describe('removeCartItem', () => {
    it('reduces the quantity when units are left over', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(cartItem(5));
      prisma.cartItem.update.mockResolvedValue(cartItem(3));

      const result = await cart.removeCartItem(USER_ID, { productId: PRODUCT.id, quantity: 2 });

      expect(result.quantity).toBe(3);
      expect(result.removed).toBeUndefined();
      expect(prisma.cartItem.delete).not.toHaveBeenCalled();
    });

    it('deletes the line once the removal takes it to zero', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(cartItem(2));

      const result = await cart.removeCartItem(USER_ID, { productId: PRODUCT.id, quantity: 2 });

      expect(result).toEqual({ productId: PRODUCT.id, quantity: 0, removed: true });
      expect(prisma.cartItem.delete).toHaveBeenCalled();
    });

    it('deletes rather than going negative when more is removed than is held', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(cartItem(1));

      const result = await cart.removeCartItem(USER_ID, { productId: PRODUCT.id, quantity: 9 });

      expect(result.quantity).toBe(0);
      expect(result.removed).toBe(true);
    });

    it('reports a line the shopper does not hold as 404', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        cart.removeCartItem(USER_ID, { productId: PRODUCT.id, quantity: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
