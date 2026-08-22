/**
 * Runs before any module is imported.
 *
 * `ConfigModule.forRoot()` reads the environment while `app.module.ts` is being
 * evaluated, which is earlier than any `beforeAll`, so the values have to be in
 * place by then. Setting them here also keeps the suite hermetic: it never
 * inherits whatever a developer happens to have in their local `.env`.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-0';
process.env.PUBLIC_BASE_URL = 'https://api.example.com';
process.env.SWAGGER_ENABLED = 'false';
// High enough that the rate limiter never interferes with a test run.
process.env.THROTTLE_LIMIT = '10000';
process.env.AUTH_THROTTLE_LIMIT = '10000';
