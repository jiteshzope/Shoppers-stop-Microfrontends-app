import { config as loadDotEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Candidate `.env` locations, ordered from most to least specific. The first
 * match wins so that a workspace-root run (`nx serve api`) and a containerised
 * run (where configuration arrives through real environment variables) both
 * behave predictably.
 */
const DOT_ENV_CANDIDATES = ['api/.env', '.env'];

export type SameSitePolicy = 'lax' | 'strict' | 'none';

export interface CookieConfig {
  /** Cookie holding the opaque session token. Never readable from JavaScript. */
  readonly sessionName: string;
  /** Cookie holding the CSRF token. Readable so the SPA can echo it back. */
  readonly csrfName: string;
  readonly secure: boolean;
  readonly sameSite: SameSitePolicy;
  readonly maxAgeMs: number;
}

export interface AppConfig {
  readonly host: string;
  readonly port: number;
  readonly isProduction: boolean;
  readonly corsOrigins: readonly string[];
  /**
   * Origin the browser reaches this API on. Product rows store image paths
   * rather than absolute URLs, so the same database works on any host; this is
   * what turns them back into links the storefront can load.
   */
  readonly publicBaseUrl: string;
  readonly databaseUrl: string;
  readonly sessionTtlHours: number;
  readonly cookie: CookieConfig;
}

function loadEnvFile(): void {
  const envFile = DOT_ENV_CANDIDATES.map((candidate) => resolve(process.cwd(), candidate)).find(
    (candidate) => existsSync(candidate),
  );

  if (envFile) {
    loadDotEnv({ path: envFile });
  }
}

function readString(key: string, fallback: string): string {
  const value = process.env[key]?.trim();
  return value ? value : fallback;
}

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for ${key}: expected a positive number, received "${raw}".`);
  }

  return parsed;
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  return raw === 'true' || raw === '1';
}

function readSameSite(key: string, fallback: SameSitePolicy): SameSitePolicy {
  const raw = process.env[key]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  if (raw !== 'lax' && raw !== 'strict' && raw !== 'none') {
    throw new Error(`Invalid value for ${key}: expected "lax", "strict" or "none", received "${raw}".`);
  }

  return raw;
}

/**
 * Reads and validates every environment-driven setting once, at startup, so that
 * a misconfigured deployment fails fast instead of surfacing as a runtime error
 * on the first request.
 */
export function loadConfig(): AppConfig {
  loadEnvFile();

  const isProduction = readString('NODE_ENV', 'development') === 'production';
  const sessionTtlHours = readNumber('SESSION_TTL_HOURS', 24);
  const sameSite = readSameSite('COOKIE_SAME_SITE', 'lax');
  const secure = readBoolean('COOKIE_SECURE', sameSite === 'none');
  const port = readNumber('PORT', 3000);

  if (sameSite === 'none' && !secure) {
    throw new Error('COOKIE_SAME_SITE="none" requires COOKIE_SECURE="true".');
  }

  return {
    host: readString('HOST', '0.0.0.0'),
    port,
    isProduction,
    corsOrigins: readString('CORS_ORIGIN', 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    // `host` defaults to 0.0.0.0, which is a bind address rather than something
    // a browser can resolve, so the fallback names localhost explicitly.
    publicBaseUrl: readString('PUBLIC_BASE_URL', `http://localhost:${port}`).replace(/\/+$/, ''),
    databaseUrl: readString(
      'DATABASE_URL',
      'postgresql://app_user:app_password@localhost:5432/ecommerce',
    ),
    sessionTtlHours,
    cookie: {
      sessionName: 'ecommerce_session',
      csrfName: 'ecommerce_csrf',
      secure,
      sameSite,
      maxAgeMs: sessionTtlHours * 60 * 60 * 1000,
    },
  };
}

export const config: AppConfig = loadConfig();
