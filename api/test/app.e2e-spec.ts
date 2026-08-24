import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Boots the real application — global guards, pipes and exception filter
 * included — against a stubbed Prisma client, so the wiring is exercised
 * without needing a database in CI.
 */

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

const prismaStub = {
  product: {
    findMany: jest.fn().mockResolvedValue([PRODUCT]),
    findUnique: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(where.id === PRODUCT.id ? PRODUCT : null),
    ),
  },
  user: { findUnique: jest.fn().mockResolvedValue(null) },
  cartItem: { findMany: jest.fn().mockResolvedValue([]) },
  refreshToken: {
    findUnique: jest.fn().mockResolvedValue(null),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  ping: jest.fn().mockResolvedValue(undefined),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

interface ErrorBody {
  statusCode: number;
  message: string;
  errors?: string[];
  path: string;
}

describe('Storefront API (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public routes', () => {
    it('answers the liveness probe outside the API prefix', async () => {
      await request(server).get('/health').expect(200, { status: 'ok' });
    });

    it('serves the catalogue without a token', async () => {
      const response = await request(server).get('/api/v1/catalog/products').expect(200);

      expect(response.body).toEqual([
        {
          id: 2,
          slug: 'nordic-ceramic-mug',
          title: 'Nordic Ceramic Mug',
          price: 18.5,
          url: 'https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg',
        },
      ]);
    });

    it('reports an unknown product as 404 in the standard error shape', async () => {
      const response = await request(server).get('/api/v1/catalog/products/9999').expect(404);

      const body = response.body as ErrorBody;
      expect(body).toMatchObject({ statusCode: 404, message: 'PRODUCT_NOT_FOUND' });
      expect(body.path).toBe('/api/v1/catalog/products/9999');
    });
  });

  describe('guarded routes', () => {
    it('refuses the cart without an access token', async () => {
      await request(server).get('/api/v1/cart').expect(401);
    });

    it('refuses a forged bearer token', async () => {
      await request(server)
        .get('/api/v1/cart')
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(401);
    });
  });

  describe('request validation', () => {
    it('rejects a registration payload that fails the DTO rules', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          name: '',
          email: 'nope',
          phoneNumber: '1',
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);

      expect((response.body as ErrorBody).errors?.length).toBeGreaterThan(1);
    });

    it('rejects fields the DTO does not declare, rather than silently dropping them', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'jz@example.com', password: 'Sh0pperPass', roles: ['ADMIN'] })
        .expect(400);

      expect((response.body as ErrorBody).message).toContain('roles');
    });
  });
});
