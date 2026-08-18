import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { verifyCsrfToken } from '../../middleware/csrf.middleware';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/authenticated-request';
import * as controller from './cart.controller';

export const cartRouter = Router();

// Every cart route belongs to the signed-in shopper.
cartRouter.use(authenticate);

cartRouter.get('/', asyncHandler<AuthenticatedRequest>(controller.listCartItems));
cartRouter.post(
  '/items',
  verifyCsrfToken,
  asyncHandler<AuthenticatedRequest>(controller.addCartItem),
);
cartRouter.post(
  '/items/remove',
  verifyCsrfToken,
  asyncHandler<AuthenticatedRequest>(controller.removeCartItem),
);
