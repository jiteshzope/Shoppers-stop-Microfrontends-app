import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../../config/app-config.service';
import { REFRESH_COOKIE_NAME } from '../auth.cookies';
import type { RefreshTokenPayload } from '../token.service';

export const REFRESH_STRATEGY = 'jwt-refresh';

/** Caller identity plus the token material `AuthService.refresh` needs. */
export interface RefreshRequestUser {
  userId: string;
  tokenId: string;
  familyId: string;
  rawToken: string;
}

/**
 * Reads the refresh token from the httpOnly cookie first and falls back to the
 * request body, which is what a cross-origin micro-frontend uses when the
 * browser will not send a third-party cookie.
 */
function extractRefreshToken(request: Request): string | null {
  const cookies = request.cookies as Record<string, string> | undefined;
  const fromCookie = cookies?.[REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) {
    return fromCookie;
  }

  const body = request.body as { refreshToken?: unknown } | undefined;
  return typeof body?.refreshToken === 'string' && body.refreshToken.length > 0
    ? body.refreshToken
    : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, REFRESH_STRATEGY) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: config.refreshTokenSecret,
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: RefreshTokenPayload): RefreshRequestUser {
    const rawToken = extractRefreshToken(request);

    if (!rawToken) {
      throw new UnauthorizedException('REFRESH_TOKEN_MISSING');
    }

    return {
      userId: payload.sub,
      tokenId: payload.jti,
      familyId: payload.fid,
      rawToken,
    };
  }
}
