import { Injectable, NotFoundException } from '@nestjs/common';
import type { CartItem, Product } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { toProductImageUrl } from '../catalog/product-image';
import type { CartItemDto, CartMutationResultDto } from './dto/cart-item.dto';
import type { CartMutationDto } from './dto/cart-mutation.dto';

type CartItemWithProduct = CartItem & { product: Product };

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async listCartItems(userId: string): Promise<CartItemDto[]> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => this.toCartItem(item));
  }

  /**
   * Adds the quantity to an existing line, or creates the line when absent.
   *
   * The upsert leans on the `(user_id, product_id)` unique index, so two
   * requests racing to add the same product still end up with one row and the
   * combined quantity rather than a duplicate.
   */
  async addCartItem(userId: string, { productId, quantity }: CartMutationDto): Promise<CartMutationResultDto> {
    if (!(await this.productExists(productId))) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const item = await this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId, quantity },
      update: { quantity: { increment: quantity } },
      include: { product: true },
    });

    return this.toMutationResult(item);
  }

  /**
   * Removes `quantity` units, deleting the line once nothing is left. Reads and
   * writes run in one transaction so two concurrent removals cannot both see
   * the pre-decrement quantity and drive the line negative.
   */
  async removeCartItem(
    userId: string,
    { productId, quantity }: CartMutationDto,
  ): Promise<CartMutationResultDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findUnique({
        where: { userId_productId: { userId, productId } },
        include: { product: true },
      });

      if (!existing) {
        throw new NotFoundException('CART_ITEM_NOT_FOUND');
      }

      const nextQuantity = existing.quantity - quantity;

      if (nextQuantity <= 0) {
        await tx.cartItem.delete({ where: { id: existing.id } });
        return { productId, quantity: 0, removed: true };
      }

      const updated = await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQuantity },
        include: { product: true },
      });

      return this.toMutationResult(updated);
    });
  }

  /** Empties the cart — used after checkout and by "clear cart" in the UI. */
  async clearCart(userId: string): Promise<{ removed: number }> {
    const { count } = await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { removed: count };
  }

  private async productExists(productId: number): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    return product !== null;
  }

  private toCartItem(item: CartItemWithProduct): CartItemDto {
    const price = item.product.price.toNumber();

    return {
      id: item.id,
      productId: item.productId,
      title: item.product.title,
      url: toProductImageUrl(this.config.publicBaseUrl, item.product.imagePath),
      quantity: item.quantity,
      price,
      lineTotal: Number((price * item.quantity).toFixed(2)),
    };
  }

  private toMutationResult(item: CartItemWithProduct): CartMutationResultDto {
    const { id, productId, quantity, title, url, price } = this.toCartItem(item);
    return { id, productId, quantity, title, url, price };
  }
}
