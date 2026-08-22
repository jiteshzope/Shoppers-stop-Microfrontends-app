import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config/environment';
import { CSRF_HEADER } from './middleware/csrf.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { PRODUCT_IMAGES_DIR, PRODUCT_IMAGES_ROUTE } from './modules/catalog/product-image';
import { healthRouter } from './modules/health/health.routes';
import { apiRouter } from './routes';

const API_PREFIX = '/api/v1';
const JSON_BODY_LIMIT = '100kb';
/** Catalog photos are part of the build and never change between deploys. */
const IMAGE_CACHE_MAX_AGE = '7d';

export function createApp(): Express {
  const app = express();

  // The SPA authenticates with cookies, so the browser only attaches them when
  // the origin is explicitly allow-listed and credentials are enabled.
  app.use(
    cors({
      origin: config.corsOrigins as string[],
      credentials: true,
      allowedHeaders: ['Content-Type', CSRF_HEADER],
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(healthRouter);
  // Served before the API router so an `<img>` tag needs no credentials, no
  // CSRF token and no JSON round trip to fetch a product photo.
  // A miss falls through to `notFoundHandler`, so a stale image path answers
  // with the same JSON error shape as every other unknown route.
  app.use(PRODUCT_IMAGES_ROUTE, express.static(PRODUCT_IMAGES_DIR, { maxAge: IMAGE_CACHE_MAX_AGE }));
  app.use(API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
