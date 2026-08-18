import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config/environment';
import { CSRF_HEADER } from './middleware/csrf.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { healthRouter } from './modules/health/health.routes';
import { apiRouter } from './routes';

const API_PREFIX = '/api/v1';
const JSON_BODY_LIMIT = '100kb';

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
  app.use(API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
