import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AccessTokenPayload } from '../token.service';

export const ACCESS_STRATEGY = 'jwt-access';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, ACCESS_STRATEGY) {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessTokenSecret,
    });
  }

  /**
   * Re-reads the user on every request rather than trusting the claims alone,
   * so a deleted account or a role change takes effect immediately instead of
   * lingering until the short-lived token expires.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, phoneNumber: true, roles: true },
    });

    if (!user) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    return user;
  }
}
