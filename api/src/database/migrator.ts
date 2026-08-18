import { logger } from '../shared/logger';
import { pool } from './pool';
import { SCHEMA_SQL } from './scripts/schema';
import { SEED_PRODUCTS_SQL } from './scripts/seed-products';

/**
 * Applied in order on every boot. Each script is idempotent, which keeps the
 * bootstrap safe to re-run against an existing database.
 */
const SCRIPTS = [
  { name: 'schema', sql: SCHEMA_SQL },
  { name: 'seed-products', sql: SEED_PRODUCTS_SQL },
] as const;

export async function runMigrations(): Promise<void> {
  for (const script of SCRIPTS) {
    await pool.query(script.sql);
    logger.info('Applied database script', { script: script.name });
  }
}
