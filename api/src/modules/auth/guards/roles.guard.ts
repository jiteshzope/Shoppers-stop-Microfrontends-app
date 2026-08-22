import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

/** Enforces `@Roles(...)`; runs after the access guard has resolved the caller. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const roles = request.user?.roles ?? [];

    return required.some((role) => roles.includes(role));
  }
}
