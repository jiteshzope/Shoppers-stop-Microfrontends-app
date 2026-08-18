import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { catalogRouter } from './modules/catalog/catalog.routes';

/** Everything served under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/cart', cartRouter);
