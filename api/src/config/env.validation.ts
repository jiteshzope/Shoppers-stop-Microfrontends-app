import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum SameSitePolicy {
  Lax = 'lax',
  Strict = 'strict',
  None = 'none',
}

/** `15m`, `7d`, `3600`… — the subset of `ms` syntax `@nestjs/jwt` accepts. */
const DURATION_PATTERN = /^\d+(ms|s|m|h|d|w|y)?$/;

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return value;
};

const toInt = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

const toLowerCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Every environment-driven setting, validated once at startup so a
 * misconfigured deployment fails on boot rather than on the first request that
 * happens to touch the missing value.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @Transform(toLowerCase)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsString()
  HOST = '0.0.0.0';

  @IsInt()
  @Max(65535)
  @Transform(toInt)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN = 'http://localhost:4200';

  @IsString()
  PUBLIC_BASE_URL = '';

  @IsBoolean()
  @Transform(toBoolean)
  SWAGGER_ENABLED = true;

  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required (use the Neon connection string).' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters.' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @Matches(DURATION_PATTERN)
  JWT_ACCESS_TTL = '15m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters.' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @Matches(DURATION_PATTERN)
  JWT_REFRESH_TTL = '7d';

  @IsBoolean()
  @Transform(toBoolean)
  COOKIE_SECURE = false;

  @IsEnum(SameSitePolicy)
  @Transform(toLowerCase)
  COOKIE_SAME_SITE: SameSitePolicy = SameSitePolicy.Lax;

  @IsInt()
  @Transform(toInt)
  THROTTLE_TTL_SECONDS = 60;

  @IsInt()
  @Transform(toInt)
  THROTTLE_LIMIT = 120;

  @IsInt()
  @Transform(toInt)
  AUTH_THROTTLE_TTL_SECONDS = 60;

  @IsInt()
  @Transform(toInt)
  AUTH_THROTTLE_LIMIT = 10;
}

export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  // `exposeDefaultValues` keeps the class field initialisers above acting as
  // the documented defaults for anything the environment leaves unset.
  const parsed = plainToInstance(EnvironmentVariables, raw, {
    exposeDefaultValues: true,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(parsed, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');

    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  if (parsed.COOKIE_SAME_SITE === SameSitePolicy.None && !parsed.COOKIE_SECURE) {
    throw new Error('COOKIE_SAME_SITE="none" requires COOKIE_SECURE="true".');
  }

  if (parsed.NODE_ENV === NodeEnv.Production && !parsed.COOKIE_SECURE) {
    // Not fatal: the API is reachable over plain HTTP in a container-only
    // setup, but a browser will silently drop a SameSite=None cookie.
    console.warn(
      'COOKIE_SECURE is false in production — refresh cookies will not be sent over HTTPS-only clients.',
    );
  }

  return parsed;
}
