# MediQueue

**Smart Hospital Queue & Appointment Management — SaaS**

Patients in Bangladesh wait 3–5 hours at hospitals with zero visibility into queue status. MediQueue solves that. Clinics and doctors subscribe monthly; patients use the platform free, forever.

[![CI](https://github.com/monjur15/MediQueue/actions/workflows/ci.yml/badge.svg)](https://github.com/monjur15/MediQueue/actions/workflows/ci.yml)

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/MediQueue.git
cd MediQueue
cp backend/.env.example backend/.env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API | http://localhost:5001 |
| API Docs (Swagger) | http://localhost:5001/api/docs |
| Health check | http://localhost:5001/health/ready |

> **First run only:** migrations run automatically on backend start. Postgres data persists in a Docker volume between restarts. Run `docker compose down -v` to wipe everything and start fresh.

---

## What It Does

Five roles, one platform:

| Role | What they get |
|------|--------------|
| **Patient** (free forever) | Queue token, real-time position updates, turn alerts via push/SMS, visit history |
| **Doctor** | Live queue dashboard, one-click "call next", break windows that auto-shift ETAs, consultation notes |
| **Tenant Admin** | Manage doctors & departments, peak-hour analytics, subscription management |
| **Super Admin** | Platform-wide MRR dashboard, tenant health, usage limits, failed payments |

### Subscription Plans

| | Solo Doctor | Clinic | Hospital |
|--|-------------|--------|----------|
| Doctors | 1 | Up to 10 | Unlimited |
| Departments | 1 | Up to 5 | Unlimited |
| Daily Patients | 50 | 300 | Unlimited |
| Price | $X/mo | $Y/mo | $Z/mo |

14-day free trial on any plan — no payment required upfront.

---

## Tech Stack

**Backend** — `backend/`
- Node.js + Express + TypeScript (ESM, strict mode)
- Socket.io — real-time queue updates
- BullMQ — background jobs (no-show detection, subscription lifecycle, reminders)
- PostgreSQL — primary data store, Row-Level Security for tenant isolation
- Redis — BullMQ backend, WebSocket pub/sub, usage counters
- Stripe — subscription billing + webhook processing
- Zod — runtime validation on every endpoint
- JWT + refresh token rotation

**Frontend** — `frontend/`
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query + Zustand
- Socket.io-client
- PWA — installable on Android, push notifications, offline queue position

**Infrastructure**
- Docker Compose (local dev, one command)
- GitHub Actions CI (type-check, lint, build on every push)

---

## Project Structure

```
MediQueue/
├── backend/
│   └── src/
│       ├── config/          # DB, Redis, Swagger setup
│       ├── middleware/       # auth, tenant resolution, rate limiting, paywall
│       ├── modules/          # one folder per domain
│       │   ├── auth/
│       │   ├── billing/
│       │   ├── clinics/
│       │   ├── departments/
│       │   ├── doctors/
│       │   ├── patients/
│       │   ├── queue/
│       │   ├── analytics/
│       │   ├── realtime/     # Socket.io server
│       │   ├── support/
│       │   ├── super/        # super admin routes
│       │   ├── tenants/
│       │   └── tracking/
│       ├── workers/          # BullMQ workers
│       └── utils/
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   ├── components/
│   ├── hooks/
│   ├── lib/                  # API client
│   └── store/                # Zustand stores
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci.yml
```

Each backend module follows the same structure: `routes → controller → service → repository`. Extractable to a microservice if needed — boundaries are clean.

---

## Key Engineering Decisions

### PostgreSQL Row-Level Security over app-layer tenant filtering
App bugs can accidentally leak data if filtering lives only in code. RLS enforces isolation at the database level — no query runs without it, regardless of what the app does. Clinic A can never see Clinic B's data even if there's a bug in the application.

### Direct SQL (`pg`) over Prisma / ORM
Needed `SELECT FOR UPDATE SKIP LOCKED` for the double-booking race condition fix. ORMs abstract this away and make it impossible to explain. Every query in this codebase is readable and explainable.

### BullMQ over `setTimeout`
`setTimeout` dies on server restart. BullMQ persists jobs in Redis, retries on failure, has concurrency control, a dead-letter queue, and a visual dashboard. No-show detection, subscription grace periods, and push reminders all run through BullMQ.

### Redis for usage metering, not Postgres
Booking checks happen on every request. A Postgres `COUNT` query on every booking adds latency. `Redis INCR` is O(1) and atomic. Counters are flushed to Postgres nightly for billing accuracy.

### Socket.io over raw WebSocket
Built-in reconnection handling. The Redis adapter enables horizontal scaling across multiple server instances with zero extra code — every client receives every update regardless of which server they connected to.

### Stripe + bKash dual payment gateway
Stripe for international reach. bKash for Bangladesh — the largest mobile payment platform in the country with ~50M users. Supporting only Stripe would exclude the primary market.

---

## Hard Problems Solved

**Double-booking race condition** — 50 patients hit "Book" simultaneously. Solution: `SELECT FOR UPDATE SKIP LOCKED` at the database level. Exactly one succeeds; the rest get a conflict error.

**Dynamic ETA recalculation** — Doctor takes a break, patient no-shows. Every downstream ETA shifts automatically using: average consultation time per doctor + active break windows + no-show rate.

**WebSocket at scale** — Two server instances, patient on Server 1 gets updates from Server 2. Solution: Redis Pub/Sub as the backbone. All instances subscribe to the same channel.

**Idempotent booking** — Patient double-submits due to bad network. Client sends a UUID idempotency key; duplicate requests return the original result without creating a ghost booking.

**Optimistic locking on notes** — Two browser tabs open the same consultation note. Solution: `version` column on the notes table. Version mismatch on save rejects with a conflict error.

**Webhook idempotency** — Stripe retries the same event twice. Solution: `payment_events` table stores processed event IDs. Duplicate is a no-op — subscription is activated exactly once.

**Subscription state machine** — `Trial → Active → Past Due → Cancelled → Expired`. Every transition managed by BullMQ scheduled jobs with grace periods and automatic feature locking.

---

## API Documentation

Full OpenAPI 3.0 spec available at `/api/docs` (Swagger UI) or `/api/docs.json` (raw JSON).

Covers all 78 endpoints across 14 modules. Every endpoint documents: request shape, response shape, required auth role, plan requirements, and error codes.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
# Database
DATABASE_URL=postgresql://postgres:mediqueue_local@localhost:5432/mediqueue

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## CI

GitHub Actions runs on every push to `main`/`develop` and every PR to `main`:

- **Backend** — TypeScript type-check (`tsc --noEmit`) + build
- **Frontend** — ESLint + Next.js build

Integration tests (require live Postgres + Redis) run locally only:

```bash
cd backend
npm run test:integration
```

---

## License

MIT
