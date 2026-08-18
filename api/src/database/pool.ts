import { Pool } from 'pg';
import { config } from '../config/environment';

/**
 * Single shared connection pool. `pg` multiplexes queries over it, so the whole
 * process must share one instance rather than opening a pool per module.
 */
export const pool = new Pool({ connectionString: config.databaseUrl });

export async function closePool(): Promise<void> {
  await pool.end();
}
