import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { verifyCsrfToken } from '../../middleware/csrf.middleware';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/authenticated-request';
import * as controller from './auth.controller';

export const authRouter = Router();

// Login and registration are what create the session, so there is no ambient
// cookie authority for a cross-site request to ride on and no CSRF check yet.
authRouter.post('/register', asyncHandler(controller.register));
authRouter.post('/login', asyncHandler(controller.login));

authRouter.get('/session', authenticate, asyncHandler<AuthenticatedRequest>(controller.currentSession));
authRouter.post(
  '/logout',
  authenticate,
  verifyCsrfToken,
  asyncHandler<AuthenticatedRequest>(controller.logout),
);
