import { Router } from 'express';
import { pool } from '../../database/pool';
import { asyncHandler } from '../../shared/async-handler';

export const healthRouter = Router();

/** Readiness probe: the process is up and the connection pool answers. */
healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  }),
);
