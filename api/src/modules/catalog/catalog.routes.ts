import { Router } from 'express';
import { asyncHandler } from '../../shared/async-handler';
import * as controller from './catalog.controller';

export const catalogRouter = Router();

catalogRouter.get('/products', asyncHandler(controller.listProducts));
catalogRouter.get('/products/:id', asyncHandler(controller.getProduct));
