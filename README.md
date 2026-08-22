# Ecommerce MF

An Angular micro-frontend storefront ("Shoppers Stop") built on Nx and Module Federation,
backed by a NestJS + Prisma + PostgreSQL API.

| Project   | Type                       | Dev port | Description                                  |
| --------- | -------------------------- | -------- | -------------------------------------------- |
| `shell`   | Module Federation host     | 4200     | Header, routing, session and cart-count state |
| `product` | Remote                     | 4201     | Catalog list and product details              |
| `cart`    | Remote                     | 4202     | Cart contents and quantity changes            |
| `auth`    | Remote                     | 4203     | Login and registration                        |
| `session` | Library (`@ecommerce-mf/session`) | –  | Contracts shared by the shell and remotes     |
| `api`     | NestJS service             | 3000     | REST API over PostgreSQL via Prisma           |

## Running locally

```sh
# 1. Database
docker compose up -d postgres

# 2. API — a standalone project with its own scripts, outside the Nx graph
cd api && npm install && npm run prisma:migrate && npm run db:seed && npm run start:dev

# 3. Storefront — the host also serves the three remotes
npx nx run shell:serve
```

The app is then on <http://localhost:4200> and the API on <http://localhost:3000>.

Copy `api/.env.example` to `api/.env` and fill in the two JWT secrets; every variable is
documented there. If port 3000 or 5432 is already taken, set `PORT` / `DATABASE_URL`
accordingly, match `PUBLIC_BASE_URL` to the new port so product images still resolve, and
update `localApiBaseUrl` in `apps/*/src/environments/environment.ts`.

See [api/README.md](api/README.md) for the API's own scripts, configuration and the
Railway + Neon deployment steps.

### Checks

```sh
npx nx run-many -t lint
npx nx run-many -t test
npx nx e2e shell-e2e          # Playwright; starts the shell dev server itself

cd api && npm run lint && npm test && npm run test:e2e
```

The Playwright suite talks to a real API, so keep the database and `npm run start:dev`
in `api/` running.

## Authentication

Short-lived JWT access tokens with rotating refresh tokens — a bearer header travels
cross-origin without depending on third-party cookies, which is what a micro-frontend on a
separate origin actually needs.

- Passwords are hashed with **Argon2id** at the OWASP baseline. A login against a
  non-existent account still verifies a dummy digest, so response time does not reveal
  which emails are registered.
- The **access token** lives 15 minutes and travels in `Authorization: Bearer …`.
- The **refresh token** lives 7 days. Only its Argon2 digest is stored, keyed by the JWT's
  `jti`, so a database dump yields no usable tokens. Every refresh rotates it, and every
  rotation of one login shares a family id — replaying an already-rotated token revokes the
  whole family.
- The refresh token is also mirrored into an `httpOnly` cookie scoped to `/api/v1/auth`,
  so a browser client can keep it out of reach of JavaScript. It is returned in the body as
  well, for clients that cannot rely on cross-site cookies; `/auth/refresh` accepts either.

There is no CSRF token any more: the old scheme authenticated with an ambient session
cookie that a cross-site page could ride, and a bearer header cannot be forged that way.

Access control is closed by default — the access-token guard is global, and a route has to
opt out with `@Public()`.

Set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` whenever the API is served over HTTPS
on a different origin than the storefront.

## API layout

`api/` is a standalone NestJS project with its own `package.json`, deliberately outside the
Nx graph so it can be deployed on its own.

```
api/
├── prisma/
│   ├── schema.prisma        data model
│   ├── migrations/          generated SQL, applied with `prisma migrate deploy`
│   └── seed.ts              idempotent catalogue seed
└── src/
    ├── main.ts              bootstrap: Helmet, CORS, validation, static images, Swagger
    ├── app.module.ts        global guards, exception filter, rate limiting
    ├── config/              environment validation and a typed accessor for it
    ├── prisma/              the shared PrismaClient
    ├── common/              exception filter, decorators, shared types
    ├── assets/products/     catalogue photos, copied into dist by the build
    └── modules/
        ├── auth/            Argon2 hashing, JWT issue/rotate, Passport strategies
        ├── catalog/         products
        ├── cart/            cart lines
        └── health/          liveness and readiness
```

Controllers only translate HTTP to and from the services; services hold the business rules
and talk to Prisma. A single exception filter turns failures into a status plus a stable
error code (`INVALID_CREDENTIALS`, `EMAIL_IN_USE`, …) that the front end maps to
user-facing copy. Unexpected failures are logged in full and reported as a generic 500.

An OpenAPI explorer is served at `/docs`.

### Endpoints

| Method | Path                            | Auth          | Purpose                       |
| ------ | ------------------------------- | ------------- | ----------------------------- |
| GET    | `/health`                       | –             | Liveness probe                |
| GET    | `/ready`                        | –             | Readiness probe (checks the DB) |
| POST   | `/api/v1/auth/register`         | –             | Create an account             |
| POST   | `/api/v1/auth/login`            | –             | Exchange credentials for tokens |
| POST   | `/api/v1/auth/refresh`          | refresh token | Rotate; returns a new pair    |
| POST   | `/api/v1/auth/logout`           | refresh token | Revoke this session           |
| POST   | `/api/v1/auth/logout-all`       | access token  | Revoke every session          |
| GET    | `/api/v1/auth/session`          | access token  | Resolve the signed-in user    |
| GET    | `/api/v1/catalog/products`      | –             | Catalog list                  |
| GET    | `/api/v1/catalog/products/:id`  | –             | Product details               |
| GET    | `/api/v1/cart`                  | access token  | Cart contents                 |
| POST   | `/api/v1/cart/items`            | access token  | Add quantity to the cart      |
| POST   | `/api/v1/cart/items/remove`     | access token  | Remove quantity from the cart |
| DELETE | `/api/v1/cart`                  | access token  | Empty the cart                |

## Catalog images

Every product ships with a photo of the thing it is named after. The files live in
`api/src/assets/products`, are copied into the build, and are served straight from the API
at `/images/products/<slug>.jpg` — no token and no JSON round trip, so an `<img>` tag is
enough. `credits.json` records the source, author and licence of each file.

`products.image_path` stores that path rather than an absolute URL, so a database seeded on a
laptop stays correct behind a container or a domain; the API expands it against
`PUBLIC_BASE_URL` on the way out. A row holding a full `http(s)` URL is passed through
untouched, which leaves room for pointing at a CDN instead.

To re-pick a photo, edit its entry in `api/tools/image-queries.json` and re-run the fetcher:

```sh
node api/tools/fetch-product-images.mjs --list "desk lamp"   # see the candidates
node api/tools/fetch-product-images.mjs --force desk-lamp     # re-download one product
node api/tools/fetch-product-images.mjs                       # fetch whatever is missing
```

Search relevance on its own is not enough — it offers a shattered light fixture for "desk
lamp" — so `--list` prints the candidates and the `file` field pins the one chosen by hand.

## Shell ↔ remote communication

Remotes never import each other. They exchange typed events over injected channels
(`AUTH_SHELL_CHANNEL`, `CART_SHELL_CHANNEL`, `PRODUCT_SHELL_CHANNEL`) declared in
`libs/session`; the shell provides the implementations. Each channel token is injected as
`{ optional: true }` so every remote still runs standalone.

## Deployment

`docker compose up --build` runs the whole stack locally. The `k8s/` manifests and
`.github/workflows/ci-cd.yml` build images, push them to ECR, and deploy to EKS behind a
single ELB, where the storefront and the API share an origin.

The API can also be deployed on its own to Railway against a Neon database — see
[api/README.md](api/README.md#deploying-to-railway).

## Nx

Run `npx nx graph` to explore the project graph, or `npx nx show project <name> --web` to see
every target a project exposes. More at <https://nx.dev>.
