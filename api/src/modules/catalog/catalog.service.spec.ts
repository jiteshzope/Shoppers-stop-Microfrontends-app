import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CatalogService } from './catalog.service';
import type { PrismaService } from '../../prisma/prisma.service';

const PRODUCT = {
  id: 2,
  slug: 'nordic-ceramic-mug',
  title: 'Nordic Ceramic Mug',
  description: 'Stoneware mug with a matte glaze finish.',
  price: new Prisma.Decimal('18.50'),
  imageUrl: 'https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CatalogService', () => {
  let prisma: { product: { findMany: jest.Mock; findUnique: jest.Mock } };
  let catalog: CatalogService;

  beforeEach(() => {
    prisma = { product: { findMany: jest.fn(), findUnique: jest.fn() } };

    catalog = new CatalogService(prisma as unknown as PrismaService);
  });

  it('serves the stored image URL verbatim', async () => {
    prisma.product.findMany.mockResolvedValue([PRODUCT]);

    const [summary] = await catalog.listProducts();

    expect(summary.url).toBe('https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg');
  });

  it('converts the Decimal price to a plain number for the wire', async () => {
    prisma.product.findUnique.mockResolvedValue(PRODUCT);

    const product = await catalog.getProduct(2);

    expect(product.price).toBe(18.5);
    expect(typeof product.price).toBe('number');
    expect(product.description).toBe(PRODUCT.description);
  });

  it('reports a missing product as 404 rather than returning null', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(catalog.getProduct(9999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
