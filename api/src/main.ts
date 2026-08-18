import type { Server } from 'node:http';
import { createApp } from './app';
import { config } from './config/environment';
import { closePool } from './database/pool';
import { runMigrations } from './database/migrator';
import { purgeExpiredSessions } from './modules/auth/auth.service';
import { logger } from './shared/logger';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;

function registerShutdownHooks(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info('Shutting down', { signal });

    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.on(signal, () => shutdown(signal));
  }
}

async function bootstrap(): Promise<void> {
  await runMigrations();

  const removedSessions = await purgeExpiredSessions();
  if (removedSessions > 0) {
    logger.info('Purged expired sessions', { count: removedSessions });
  }

  const server = createApp().listen(config.port, config.host, () => {
    logger.info('API ready', { url: `http://${config.host}:${config.port}` });
  });

  registerShutdownHooks(server);
}

void bootstrap().catch((error: unknown) => {
  logger.error('API failed to start', {
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
  process.exit(1);
});
