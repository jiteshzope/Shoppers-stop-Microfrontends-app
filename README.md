# Ecommerce MF

An Angular micro-frontend storefront ("Shoppers Stop") built on Nx and Module Federation,
backed by an Express + PostgreSQL API.

| Project   | Type                       | Dev port | Description                                  |
| --------- | -------------------------- | -------- | -------------------------------------------- |
| `shell`   | Module Federation host     | 4200     | Header, routing, session and cart-count state |
| `product` | Remote                     | 4201     | Catalog list and product details              |
| `cart`    | Remote                     | 4202     | Cart contents and quantity changes            |
| `auth`    | Remote                     | 4203     | Login and registration                        |
| `session` | Library (`@ecommerce-mf/session`) | –  | Contracts shared by the shell and remotes     |
| `api`     | Express service            | 3000     | REST API over PostgreSQL                      |

## Running locally

```sh
# 1. Database
docker compose up -d postgres

# 2. API — creates the schema and seeds the catalog on boot
npx nx serve api

# 3. Storefront — the host also serves the three remotes
npx nx run shell:serve
```

The app is then on <http://localhost:4200> and the API on <http://localhost:3000>.

Copy `api/.env.example` to `api/.env` to override any setting; every variable is
documented there. If port 3000 or 5432 is already taken, set `PORT` / `DATABASE_URL`
accordingly, match `PUBLIC_BASE_URL` to the new port so product images still resolve, and
update `localApiBaseUrl` in `apps/*/src/environments/environment.ts`.

### Checks

```sh
npx nx run-many -t lint
npx nx run-many -t test
npx nx e2e shell-e2e          # Playwright; starts the shell dev server itself
```

The e2e suite talks to a real API, so keep the database and `nx serve api` running.

## Authentication

The session credential never reaches JavaScript.

- On login or registration the API issues an opaque random session token, stores only its
  SHA-256 digest in `sessions`, and returns it in an **`httpOnly`** cookie. Nothing is kept
  in `localStorage`, `sessionStorage`, or application state, so an injected script has
  nothing to steal.
- Because the browser attaches that cookie automatically, every state-changing request must
  also carry the per-session CSRF token in an `X-CSRF-Token` header. The token is delivered
  in a second, readable cookie; a cross-site page can trigger a request but cannot read the
  cookie to fill in the header. `apiSessionInterceptor` adds it on the client, and
  `verifyCsrfToken` checks it (in constant time) on the server.
- That readable CSRF cookie doubles as a non-secret "session present" hint, which lets the
  SPA skip pointless calls and redirect guests without ever holding a credential.
  `GET /api/v1/auth/session` remains the only authority on whether a session is valid, and
  is what the app uses to rehydrate after a reload.

Set `COOKIE_SECURE=true` (and `COOKIE_SAME_SITE` if the API is on a different site than the
storefront) whenever the API is served over HTTPS.

## API layout

`api/src` is organised by layer, with each feature owning its full slice:

```
api/src
├── main.ts                  bootstrap: migrations, listen, graceful shutdown
├── app.ts                   express wiring (CORS, parsers, routers, error handling)
├── routes.ts                /api/v1 router aggregation
├── assets/products/         catalog photos, served as static files
├── config/environment.ts    validated, typed configuration read once at startup
├── database/                pool, migration runner, schema and seed scripts
├── middleware/              authenticate, CSRF, 404 and error handlers
├── shared/                  HttpError, async handler, parsing, logging
└── modules/
    ├── auth/                routes → controller → service → repository (+ validator, cookies)
    ├── catalog/             routes → controller → service → repository
    ├── cart/                routes → controller → service → repository (+ validator)
    └── health/              readiness probe
```

Controllers only translate HTTP to and from the services; services hold the business rules;
repositories own the SQL. Handlers throw `HttpError`, and a single error middleware turns
those into a status plus a stable error code (`INVALID_CREDENTIALS`, `EMAIL_IN_USE`, …) that
the front end maps to user-facing copy. Unexpected failures are logged in full and reported
as a generic 500.

### Endpoints

| Method | Path                            | Auth        | Purpose                     |
| ------ | ------------------------------- | ----------- | --------------------------- |
| GET    | `/health`                       | –           | Readiness probe             |
| POST   | `/api/v1/auth/register`         | –           | Create an account           |
| POST   | `/api/v1/auth/login`            | –           | Start a session             |
| GET    | `/api/v1/auth/session`          | cookie      | Resolve the signed-in user  |
| POST   | `/api/v1/auth/logout`           | cookie+CSRF | Revoke the session          |
| GET    | `/api/v1/catalog/products`      | –           | Catalog list                |
| GET    | `/api/v1/catalog/products/:id`  | –           | Product details             |
| GET    | `/api/v1/cart`                  | cookie      | Cart contents               |
| POST   | `/api/v1/cart/items`            | cookie+CSRF | Add quantity to the cart    |
| POST   | `/api/v1/cart/items/remove`     | cookie+CSRF | Remove quantity from the cart |

## Catalog images

Every product ships with a photo of the thing it is named after. The files live in
`api/src/assets/products`, are copied into the build, and are served straight from the API
at `/images/products/<slug>.jpg` — no cookie, no CSRF token and no JSON round trip, so an
`<img>` tag is enough. `credits.json` records the source, author and licence of each file.

`products.image_url` stores that path rather than an absolute URL, so a database seeded on a
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

## Nx

Run `npx nx graph` to explore the project graph, or `npx nx show project <name> --web` to see
every target a project exposes. More at <https://nx.dev>.
