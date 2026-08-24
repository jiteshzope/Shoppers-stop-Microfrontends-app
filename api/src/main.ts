// Loaded first so `process.env` is populated before any module-level decorator
// reads it (see common/throttling.ts). Railway supplies real environment
// variables; this only matters for local runs backed by a .env file.
import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { PRODUCT_IMAGES_DIR, PRODUCT_IMAGES_ROUTE } from './modules/catalog/product-image';
import { TokenService } from './modules/auth/token.service';

const API_PREFIX = 'api/v1';
const JSON_BODY_LIMIT = '100kb';
/** Catalogue photos ship with the build and never change between deploys. */
const IMAGE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function bootstrap(): Promise<void> {
  // Logs stream as they are written. Nothing here attaches a custom logger, so
  // buffering them bought nothing and cost the ability to see why a boot that
  // never reaches `listen()` stalled.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });

  // Railway terminates TLS at its edge, so the client IP and protocol arrive in
  // X-Forwarded-* headers. Rate limiting keys on the IP, so it has to be read
  // from there rather than from the socket.
  app.set('trust proxy', 1);

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip anything the DTO does not declare, and reject rather than ignore
      // a payload that carries unexpected fields.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix(API_PREFIX, {
    // Probes answer at /health and /ready so a platform check needs no
    // knowledge of the versioning scheme.
    exclude: ['health', 'ready'],
  });

  // Served without the API prefix and without credentials, so an <img> tag needs
  // no token, no CORS preflight and no JSON round trip to fetch a photo.
  app.useStaticAssets(PRODUCT_IMAGES_DIR, {
    prefix: PRODUCT_IMAGES_ROUTE,
    maxAge: IMAGE_CACHE_MAX_AGE_MS,
    immutable: true,
    fallthrough: false,
  });

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Shoppers Stop storefront API')
        .setDescription('Catalogue, cart and Argon2/JWT authentication for the micro-frontend.')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
        .addCookieAuth('ecommerce_refresh')
        .build(),
    );

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();

  await app.listen(config.port, config.host);

  logger.log(`API ready on http://${config.host}:${config.port}/${API_PREFIX}`);
  if (config.swaggerEnabled) {
    logger.log(`OpenAPI explorer on http://${config.host}:${config.port}/docs`);
  }

  // Rows that have already expired can no longer be replayed, so clearing them
  // on boot keeps the table from growing without bound on a long-lived deploy.
  // It is housekeeping rather than a startup precondition, so it runs once the
  // port is already open: a slow or unreachable database costs a log line here
  // instead of keeping the liveness probe from ever being answered.
  void app
    .get(TokenService)
    .purgeExpiredTokens()
    .catch((error: unknown) => {
      logger.warn(
        `Could not purge expired refresh tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
}

void bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    'API failed to start',
    error instanceof Error ? error.stack : error,
  );
  process.exit(1);
});
