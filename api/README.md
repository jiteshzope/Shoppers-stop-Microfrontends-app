# Storefront API

NestJS + Prisma + PostgreSQL. Serves the catalogue, the cart and authentication
for the Shoppers Stop micro-frontend.

This folder is a **standalone project**. It has its own `package.json`, its own
`node_modules` and its own build, and it deliberately sits outside the Nx graph
(see `.nxignore` at the workspace root) so it can be deployed on its own.

```
prisma/
  schema.prisma          data model
  migrations/            generated SQL, applied with `prisma migrate deploy`
  seed.ts                idempotent catalogue seed
  products.ts            the 26 reference products
src/
  main.ts                bootstrap: Helmet, CORS, validation, static images, Swagger
  app.module.ts          global guards, filter and rate limiting
  config/                environment validation and a typed accessor for it
  prisma/                the shared PrismaClient
  common/                exception filter, decorators, shared types
  modules/
    auth/                Argon2 hashing, JWT issue/rotate, Passport strategies
    catalog/             products
    cart/                cart lines
    health/              /health and /ready
  assets/products/       the catalogue photos, copied into dist by the build
```

## Running locally

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the two JWT secrets
npm run prisma:migrate      # create the schema
npm run db:seed             # load the 26 products
npm run start:dev
```

The API listens on `http://localhost:3000`, the OpenAPI explorer on
`http://localhost:3000/docs`.

A Postgres for local work:

```bash
docker run -d --name ecommerce_mf_db -p 5433:5432 \
  -e POSTGRES_USER=app_user -e POSTGRES_PASSWORD=app_password \
  -e POSTGRES_DB=ecommerce postgres:16
```

### Other scripts

| Script | Does |
| --- | --- |
| `npm run build` | Compiles to `dist/`, plus the seed to `dist/seed/seed.js` |
| `npm test` | Unit tests |
| `npm run test:e2e` | HTTP tests against a stubbed database |
| `npm run lint` | ESLint, type-aware, zero warnings allowed |
| `npm run prisma:studio` | Browse the data |
| `npm run db:seed:dist` | Run the compiled seed (no ts-node needed) |

## Configuration

Every variable is validated at boot, so a misconfigured deployment fails
immediately rather than on the first request that needs the missing value. See
`.env.example` for the full list with comments. The ones without a default:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string in deployed environments |
| `JWT_ACCESS_SECRET` | ≥ 32 chars. `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | ≥ 32 chars, **different** from the access secret |

Two separate secrets means a leaked access-token secret cannot be used to mint
refresh tokens.

## Authentication

Short-lived JWT access tokens with rotating refresh tokens.

- **Passwords** are hashed with **Argon2id** at the OWASP baseline (19 MiB, two
  passes). A login against a non-existent account still verifies a dummy digest,
  so response time does not reveal which emails are registered. A successful
  login silently re-hashes a digest built with weaker parameters, so raising the
  cost factor never needs a password reset.
- **Access tokens** live 15 minutes and travel in `Authorization: Bearer …`.
- **Refresh tokens** live 7 days. Only their Argon2 digest is stored, keyed by
  the JWT's `jti`, so a database dump yields no usable tokens. Every refresh
  rotates the token; every rotation of one login shares a `familyId`.
- **Reuse detection**: presenting an already-rotated token revokes the entire
  family. Both the attacker and the legitimate client are forced to log in
  again, because there is no way to tell which of the two holds the stolen copy.
- The refresh token is **also** set as an httpOnly cookie scoped to
  `/api/v1/auth`, so a browser client can keep it out of reach of JavaScript. It
  is returned in the response body as well, for clients that cannot rely on
  cross-site cookies. Use whichever fits; `/auth/refresh` accepts either.

There is no CSRF token any more. The old scheme authenticated with an ambient
session cookie, which a cross-site page could ride; a bearer header cannot be
forged that way.

Access control is **closed by default** — the access-token guard is global, and
a route has to opt out with `@Public()`.

## Endpoints

All under `/api/v1` except the probes.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Create an account, returns a token pair |
| `POST` | `/auth/login` | — | Exchange credentials for a token pair |
| `POST` | `/auth/refresh` | refresh token | Rotate; returns a new pair |
| `POST` | `/auth/logout` | refresh token | Revoke this session |
| `POST` | `/auth/logout-all` | access token | Revoke every session |
| `GET` | `/auth/session` | access token | The caller behind the token |
| `GET` | `/catalog/products` | — | List products |
| `GET` | `/catalog/products/:id` | — | One product |
| `GET` | `/cart` | access token | The caller's cart |
| `POST` | `/cart/items` | access token | Add units of a product |
| `POST` | `/cart/items/remove` | access token | Remove units |
| `DELETE` | `/cart` | access token | Empty the cart |
| `GET` | `/health` | — | Liveness; never touches the database |
| `GET` | `/ready` | — | Readiness; checks the database |
| `GET` | `/images/products/*.jpg` | — | Catalogue photos |

Failures all share one shape:

```json
{
  "statusCode": 404,
  "message": "PRODUCT_NOT_FOUND",
  "path": "/api/v1/catalog/products/9999",
  "timestamp": "2026-08-22T07:15:31.731Z"
}
```

`message` is a stable code the front end maps to user-visible copy. Validation
failures add an `errors` array with the field-level detail.

Rate limits are per IP: 120 requests/minute by default, and a tighter 10/minute
on `/auth/login` and `/auth/register`. `/auth/refresh` stays on the default
budget — it presents a signed, high-entropy token rather than a guessable
secret, and a storefront with several micro-frontends and a short access TTL
spends refreshes quickly. Rotation with reuse detection is what guards it.

## Deploying to Railway

Railway builds this folder, and Neon holds the database.

1. **New Project → Deploy from GitHub repo**, pick this repository.
2. **Settings → Root Directory: `api`.** Without this, Railway builds the Nx
   workspace at the repo root instead of the API.
3. **Settings → Deploy → Custom Start Command:**
   ```
   npx prisma migrate deploy && node dist/main.js
   ```
   Railway runs `npm ci` and `npm run build` on its own. `migrate deploy`
   applies any pending migration before the process starts, so a deploy that
   adds a column cannot serve traffic against the old schema.
4. **Settings → Networking → Generate Domain**, then set `PUBLIC_BASE_URL` to
   the domain it hands you.
5. **Variables:**

   ```
   NODE_ENV=production
   DATABASE_URL=<the Neon pooled connection string>
   JWT_ACCESS_SECRET=<openssl rand -base64 48>
   JWT_REFRESH_SECRET=<a different one>
   CORS_ORIGIN=https://your-shell.app,https://your-product.app,https://your-cart.app,https://your-auth.app
   PUBLIC_BASE_URL=https://<your-service>.up.railway.app
   COOKIE_SECURE=true
   COOKIE_SAME_SITE=none
   SWAGGER_ENABLED=false
   ```

   `PORT` and `HOST` are left alone — Railway injects `PORT`, and `HOST`
   defaults to `0.0.0.0`.

   `COOKIE_SAME_SITE=none` is what lets the refresh cookie travel from the API's
   domain to a micro-frontend on a different one; it requires `COOKIE_SECURE=true`.
   If your front ends send the refresh token in the body instead, neither
   matters.

6. **Health check path:** `/health` (already in `railway.json`).
7. **Seed the catalogue once**, from your machine against the Neon URL:
   ```bash
   DATABASE_URL="<neon url>" npm run db:seed
   ```
   The seed upserts by slug, so re-running it refreshes copy and pricing without
   duplicating rows. Set `SEED_USER_PASSWORD` (and/or `SEED_ADMIN_PASSWORD`) if
   you also want a demo login; without them no account is created.

### Neon notes

Use the **pooled** connection string. Neon appends `?sslmode=require`, which
Prisma honours as-is.

## How the micro-frontends consume this

The Angular apps are already on this scheme; `libs/session` holds the shared
pieces (`SessionTokenService` and one `apiSessionInterceptor` for all four
apps). If you point a different client at the API, the shape is:

- keep the access token in memory and send it as `Authorization: Bearer …`;
- on a 401, `POST /auth/refresh` — with the refresh token in the body, or
  relying on the cookie where the client is same-site — then replay the request
  once. Only if the refresh fails is the shopper actually signed out;
- **serialise refreshes.** Rotation means a token is single-use, and presenting
  a rotated one is treated as theft and revokes the whole family. Two tabs
  refreshing at the same moment will sign the shopper out of both unless the
  calls are serialised (the storefront uses a Web Locks lock for this).

Catalogue and cart response bodies are unchanged from the Express version apart
from a new `slug` on products.
