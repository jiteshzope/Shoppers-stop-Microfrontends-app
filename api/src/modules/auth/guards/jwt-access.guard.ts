import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { ACCESS_STRATEGY } from '../strategies/jwt-access.strategy';

/**
 * Applied globally, so every route requires a valid access token unless it is
 * marked `@Public()`. Authentication is the default and exemptions are explicit,
 * which is the safer way round: a new endpoint added without thinking about auth
 * is closed, not open.
 */
@Injectable()
export class JwtAccessGuard extends AuthGuard(ACCESS_STRATEGY) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic ? true : super.canActivate(context);
  }
}
