# ────────────────────────────────────────────────────────────────
#  MediQueue — Frontend Dockerfile (multi-stage)
#
#  NEXT_PUBLIC_* env vars are BAKED IN at build time (Next.js
#  limitation). Override them via docker-compose build args
#  if you deploy backend on a non-localhost address.
#
#  Stage 1 (deps)    Install all node_modules (incl. dev).
#  Stage 2 (builder) next build → .next/
#  Stage 3 (runner)  Slim image: .next + node_modules + public.
# ────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
# libc6-compat needed by some native Next.js binaries on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are embedded into JS bundles at build time.
# Pass --build-arg NEXT_PUBLIC_API_URL=https://your-api.com to
# point the browser at a different backend.
ARG NEXT_PUBLIC_API_URL=http://localhost:5001
ARG NEXT_PUBLIC_WS_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Disable Next.js telemetry in CI / Docker builds
ENV NEXT_TELEMETRY_DISABLED=1

# next-pwa requires webpack (not Turbopack) — use --webpack flag
RUN npm run build

# ── Stage 3: Runtime image ────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Static assets
COPY --from=builder /app/public ./public

# Next.js build output
COPY --from=builder /app/.next ./.next

# node_modules (next binary lives here)
COPY --from=builder /app/node_modules ./node_modules

# Package manifest (needed for `npm start`)
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["npm", "start"]
