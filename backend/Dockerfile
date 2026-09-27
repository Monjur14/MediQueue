# ────────────────────────────────────────────────────────────────
#  MediQueue — Backend Dockerfile (multi-stage)
#
#  Stage 1 (deps)    Install production node_modules.
#                    Needs python3/make/g++ to compile native
#                    add-ons (bcrypt, pg-native if present).
#
#  Stage 2 (builder) Install ALL deps, compile TypeScript → dist/
#
#  Stage 3 (runner)  Slim image: compiled JS + prod node_modules.
#                    Migrations and seeds run via entrypoint.
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Production dependencies ─────────────────────────────
FROM node:22-alpine AS deps
# Build tools for native modules (bcrypt, pg)
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: TypeScript build ─────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 3: Runtime image ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Production node_modules (pre-built native addons from deps stage)
COPY --from=deps    /app/node_modules  ./node_modules

# Compiled application
COPY --from=builder /app/dist          ./dist

# Package manifest (needed by node-pg-migrate bin resolution)
COPY package.json ./

# Migrations: plain .js files — executed by node-pg-migrate at startup
COPY src/db/ ./src/db/

# Startup script: migrate → seed → serve
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["./docker-entrypoint.sh"]
