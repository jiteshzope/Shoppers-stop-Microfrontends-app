import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Reads the caller that `JwtAccessStrategy` attached to the request, so a
 * controller never has to reach into `req.user` and cast.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return field ? request.user[field] : request.user;
  },
);
