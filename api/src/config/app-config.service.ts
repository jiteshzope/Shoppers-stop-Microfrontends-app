import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { EnvironmentVariables, NodeEnv } from './env.validation';

/**
 * Typed façade over `ConfigService`.
 *
 * Everything the app reads from the environment goes through here, so no
 * feature module has to know an environment variable's name or how to coerce
 * its value.
 */
/**
 * `ms`-style duration accepted by `@nestjs/jwt`. The env validator has already
 * checked the string's shape, so the cast at the read site is safe.
 */
type TokenTtl = JwtSignOptions['expiresIn'];

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  private get<K extends keyof EnvironmentVariables>(key: K): EnvironmentVariables[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): NodeEnv {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnv.Production;
  }

  get host(): string {
    return this.get('HOST');
  }

  get port(): number {
    return this.get('PORT');
  }

  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED');
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get accessTokenSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }

  get accessTokenTtl(): TokenTtl {
    return this.get('JWT_ACCESS_TTL') as TokenTtl;
  }

  get refreshTokenSecret(): string {
    return this.get('JWT_REFRESH_SECRET');
  }

  get refreshTokenTtl(): TokenTtl {
    return this.get('JWT_REFRESH_TTL') as TokenTtl;
  }

  get throttle(): { ttlSeconds: number; limit: number } {
    return { ttlSeconds: this.get('THROTTLE_TTL_SECONDS'), limit: this.get('THROTTLE_LIMIT') };
  }

  get authThrottle(): { ttlSeconds: number; limit: number } {
    return {
      ttlSeconds: this.get('AUTH_THROTTLE_TTL_SECONDS'),
      limit: this.get('AUTH_THROTTLE_LIMIT'),
    };
  }

  /**
   * Options for the refresh-token cookie. `httpOnly` keeps the token out of
   * reach of any script on the page; the path pins it to the one endpoint that
   * consumes it so it is never attached to ordinary API calls.
   */
  refreshCookieOptions(maxAgeMs: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.get('COOKIE_SECURE'),
      sameSite: this.get('COOKIE_SAME_SITE'),
      path: '/api/v1/auth',
      maxAge: maxAgeMs,
    };
  }
}
