import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/authenticated-request';
import * as cartService from './cart.service';
import { parseCartMutationPayload } from './cart.validator';

export async function listCartItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.status(200).json(await cartService.listCartItems(req.currentUser.id));
}

export async function addCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const payload = parseCartMutationPayload(req.body);
  res.status(200).json(await cartService.addCartItem(req.currentUser.id, payload));
}

export async function removeCartItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const payload = parseCartMutationPayload(req.body);
  res.status(200).json(await cartService.removeCartItem(req.currentUser.id, payload));
}
