import type { Request, Response } from 'express';
import { parsePositiveInteger } from '../../shared/parse';
import * as catalogService from './catalog.service';

export async function listProducts(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await catalogService.listProducts());
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const productId = parsePositiveInteger(req.params['id'], 'INVALID_PRODUCT_ID');
  res.status(200).json(await catalogService.getProduct(productId));
}
