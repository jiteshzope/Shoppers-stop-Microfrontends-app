# The API is self-contained: its build context is this folder, not the Nx
# workspace root.

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate`, which needs the schema — hence the copy
# above this line.
RUN npm ci --prefer-offline --no-audit

COPY . .
RUN npm run build

# Drop the dev dependencies from the tree that gets copied forward, keeping the
# generated Prisma client and the CLI that `migrate deploy` needs at boot.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Prisma's query engine is built against OpenSSL.
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

USER node
EXPOSE 3000

# Migrations run before the process starts, so a deploy that adds a column
# cannot serve traffic against the old schema.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
