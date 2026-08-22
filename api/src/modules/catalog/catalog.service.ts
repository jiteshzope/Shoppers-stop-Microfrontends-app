import { Injectable, NotFoundException } from '@nestjs/common';
import type { Product } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProductDetailsDto, ProductSummaryDto } from './dto/product.dto';
import { toProductImageUrl } from './product-image';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async listProducts(): Promise<ProductSummaryDto[]> {
    const products = await this.prisma.product.findMany({ orderBy: { id: 'asc' } });
    return products.map((product) => this.toSummary(product));
  }

  async getProduct(id: number): Promise<ProductDetailsDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    return { ...this.toSummary(product), description: product.description };
  }

  /** Guards cart writes; cheaper than loading the whole row. */
  async productExists(id: number): Promise<boolean> {
    const found = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    return found !== null;
  }

  private toSummary(product: Product): ProductSummaryDto {
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      // `Decimal` keeps full precision in the database; the wire format is a
      // plain number because that is what the storefront arithmetic expects.
      price: product.price.toNumber(),
      url: toProductImageUrl(this.config.publicBaseUrl, product.imagePath),
    };
  }
}
