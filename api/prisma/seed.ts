import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { SEED_PRODUCTS } from './products';

const prisma = new PrismaClient();

/** Matches PRODUCT_IMAGES_ROUTE in src/modules/catalog/product-image.ts. */
const PRODUCT_IMAGES_ROUTE = '/images/products';

/**
 * Optional demo accounts. Both are skipped unless the matching password is
 * supplied, so a production seed never creates a login nobody asked for.
 */
const DEMO_ACCOUNTS = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@shoppersstop.test',
    password: process.env.SEED_ADMIN_PASSWORD,
    name: 'Store Admin',
    phoneNumber: '919000000001',
    roles: [Role.USER, Role.ADMIN],
  },
  {
    email: process.env.SEED_USER_EMAIL ?? 'shopper@shoppersstop.test',
    password: process.env.SEED_USER_PASSWORD,
    name: 'Demo Shopper',
    phoneNumber: '919000000002',
    roles: [Role.USER],
  },
];

async function seedProducts(): Promise<number> {
  for (const product of SEED_PRODUCTS) {
    const data = {
      title: product.title,
      description: product.description,
      price: product.price,
      imagePath: `${PRODUCT_IMAGES_ROUTE}/${product.slug}.jpg`,
    };

    // Upserted by slug so re-running the seed refreshes copy and pricing
    // without ever duplicating a row or disturbing carts that reference it.
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { slug: product.slug, ...data },
    });
  }

  return SEED_PRODUCTS.length;
}

async function seedDemoAccounts(): Promise<number> {
  let created = 0;

  for (const account of DEMO_ACCOUNTS) {
    if (!account.password) {
      continue;
    }

    const passwordHash = await argon2.hash(account.password, { type: argon2.argon2id });

    await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash, roles: account.roles },
      create: {
        email: account.email,
        name: account.name,
        phoneNumber: account.phoneNumber,
        passwordHash,
        roles: account.roles,
      },
    });

    created += 1;
  }

  return created;
}

async function main(): Promise<void> {
  const products = await seedProducts();
  const accounts = await seedDemoAccounts();

  console.log(`Seeded ${products} products.`);
  console.log(
    accounts > 0
      ? `Seeded ${accounts} demo account(s).`
      : 'No demo accounts seeded (set SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD to create them).',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
