# CLAUDE.md — MediQueue Frontend

Read this before touching any file. **For any UI work, also read `DESIGN.md` first — it is mandatory.**

## Project

**MediQueue** — smart hospital queue and appointment management SaaS for Bangladesh.
Clinics and doctors subscribe; patients use it free.
Roles: `super_admin` | `tenant_admin` | `doctor` | `patient` (plus unauthenticated visitors).

## Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 16 (App Router) | `app/` directory, server components by default |
| TypeScript (strict) | `strict: true`, zero `any` |
| Tailwind CSS v4 | Styling via design tokens in `app/globals.css` |
| shadcn/ui (Radix) | Primitives — restyle to `DESIGN.md` before use |
| TanStack Query v5 | Server state |
| Zustand v5 | Client state (auth store) |
| Axios | HTTP client in `lib/api.ts` |
| Socket.io-client v4 | Real-time queue updates |
| Sonner | Toasts |
| lucide-react | Icons — do not add other icon libraries |
| next-pwa | PWA, service worker, push notifications |

## Design System

`DESIGN.md` ("Clinical Swiss") is the single source of truth for how every page looks:
colors, fonts, spacing, radius, components, motion and copy. The homepage (`components/home/`)
and the login page are the reference implementations. Summary:

- Only `mq-*` color tokens; one teal accent; no gradients, no shadows, no `rounded-*`
- IBM Plex Sans everywhere (`font-sans`); Plex Mono (`font-mono`) only for data
- Tailwind type scale and the allowed spacing values only — no arbitrary px values
- Left-aligned 12-column grid, hairline borders for structure
- New pages must match; when touching an old page, migrate it to the system

## Project Structure

```
app/
  (auth)/          login, register, register/tenant, setup-password
  (dashboard)/     admin, admin/queue, admin/settings, doctor, queue (patient), super
  layout.tsx       fonts + global body styles
  page.tsx         homepage (logged-out) / redirect to dashboard (logged-in)
  providers.tsx    TanStack Query + Toaster
components/
  shared/          design-system primitives (Container, ButtonLink, buttonClasses, Logo, Reveal)
  home/            homepage sections
  auth/            AuthField, AuthNotice, AuthAside for (auth) pages
  ui/              shadcn primitives — add with `npx shadcn add`, then restyle
  layout/          dashboard layout pieces
hooks/
  api/             TanStack Query hooks, one file per domain
  useAuth.ts  useQueueSocket.ts
lib/               api.ts (axios), socket.ts (singleton), utils.ts (cn, formatters), plans.ts (plan prices)
store/             auth.store.ts (Zustand)
types/             index.ts — all shared types
DESIGN.md          design system (read before UI work)
```

## File Size Rule

**Keep every file under ~200 lines.** Longer files eat context and reduce how reliably Claude
follows them. When a file grows past that, split it:
- Page with too much UI → extract section components
- Component with too much logic → extract a hook into `hooks/`
- Hook doing too much → split by concern

This is a hard rule, not a suggestion. It applies to this file and `DESIGN.md` too.

## Code Rules

**TypeScript** — strict, zero `any` (use `unknown` + narrowing). Shared types in `types/index.ts`.
Prefer `type` over `interface` for plain shapes.

**Components** — server components by default; `'use client'` only for state, effects, events or
browser APIs. One component per file. Props type at the top: `type NameProps = { ... }`.

**Data fetching** — all HTTP through the axios instance in `lib/api.ts`. TanStack Query for
server state (no `useState` + `useEffect` fetching). Query keys are arrays: `['appointments', id]`.
Mutations invalidate affected queries on success.

**State** — server state in TanStack Query; auth/client state in Zustand. Don't add stores
without checking TanStack Query covers it first.

**Real-time** — socket singleton in `lib/socket.ts`; subscribe through `useQueueSocket`,
never in JSX. Always clean up listeners in the effect return.

**Toasts** — `sonner` (`toast.success`, `toast.error`). Copy rules in `DESIGN.md` §8.

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `QueuePositionCard.tsx` |
| Hooks | `use` prefix | `useQueueSocket.ts` |
| Store files | `.store.ts` suffix | `auth.store.ts` |
| Types | PascalCase | `QueueToken` |
| Route segments | kebab-case folders | `queue/search/page.tsx` |
| Constants | SCREAMING_SNAKE | `MAX_PATIENTS_SOLO` |

## Route Groups

| Group | Paths | Access |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/setup-password` | Unauthenticated |
| `(dashboard)` | `/admin`, `/doctor`, `/queue`, `/super` | Authenticated, role-gated |

Role gating lives in `(dashboard)/layout.tsx` — never rely on hiding UI alone.

## Git Conventions

Format `<type>: <short description>` — under 72 chars, present tense, lowercase, no period.
Types: `chore` `feat` `fix` `refactor` `style` `test` `docs`.
Branches: `feat/<name>`, `fix/<name>`. Branch off `dev`, PR into `dev`; `main` is production.

## What Claude Must Never Do

- Add `any`, or write backend/DB logic in the frontend
- Put business logic in `page.tsx` — it belongs in a hook or component
- Edit `components/ui/` by hand to add components — use `npx shadcn add`, then restyle
- Use `localStorage` for auth tokens — use the Zustand store
- Add another HTTP client, icon library, font or color outside `DESIGN.md`
- Use `gray-*`, `blue-*` or other raw Tailwind colors, `rounded-*`, shadows or gradients
- Write a file over 200 lines without splitting it

## Environment Variables

Prefix with `NEXT_PUBLIC_` only when the browser needs the value.

```
NEXT_PUBLIC_API_URL      # backend base URL
NEXT_PUBLIC_SOCKET_URL   # socket.io server URL
```

---

## Project Progress

> Claude: update this section whenever a task is completed or a new gap is found.
> Last updated: 2026-09-28

### ✅ DONE — Frontend

**Pages (all routes built)**
- Auth: `/login`, `/register`, `/register/tenant`, `/setup-password`
- Patient: `/queue` (home + active token), `/queue/search`, `/queue/history`, `/queue/profile`
- Doctor: `/doctor` (live queue dashboard), `/doctor/settings`
- Admin: `/admin` (tabbed dashboard), `/admin/queue`, `/admin/settings`
- Super Admin: `/super`, `/super/tenants`, `/super/doctors`, `/super/patients`, `/super/subscriptions`, `/super/revenue`, `/super/logs`, `/super/messages`
- Billing: `/billing` (Stripe plans + upgrade flow), `/billing/success`
- Demo: `/demo` (full offline queue simulation — Patient, Doctor, Reception screens)
- Homepage: full marketing page (Hero, Problem, Features, HowItWorks, Pricing, Contact, Footer)

**Components**
- Doctor: DoctorQueueView, NowServingPanel, QueueTable, SeenList, BreakPanel, BreakPicker
- Patient: ActiveTokenPanel, QueueStates, AheadSquares, search (SearchBox, SearchResults, ClinicQueue, SessionRow), ChannelPicker, PushAlerts, PushAlertsCard, PushPermissionDialog, ProfileForm
- Admin: AnalyticsTab, DepartmentsTab + DepartmentPanel + dialogs, DoctorsTab + InviteDoctorDialog, SessionsTab + ActiveSessionPanel + OpenSessionDialog + ClosedSessions + TodayStats
- Super: full UI library in `components/super/ui.tsx`
- Auth: AuthField, AuthNotice, AuthAside, PasswordField, PhoneField, PlanPicker
- Shared: Logo, Reveal, primitives (Container, ButtonLink, buttonClasses), QueuePreview, Footer
- Dashboard: AppHeader, AccountBar
- PWA: InstallButton, InstallModal
- Demo: DemoPage, DoctorScreen, PatientScreen, ReceptionScreen, ActivityLog, DemoGuide, demoStore

**Hooks**
- `useQueueSocket` — real-time Socket.io hook with full event handling
- `useAuth` — Zustand auth store hook
- `usePushNotifications` — Web Push subscription management
- `useDebouncedValue` — utility
- API hooks: `hooks/api/admin.ts`, `auth.ts`, `billing.ts`, `clinics.ts`, `doctor.ts`, `push.ts`, `queue.ts`, `super.ts`, `support.ts`

**Infrastructure**
- PWA: next-pwa configured, Web App Manifest, service worker
- Push notifications: full subscription + delivery flow
- TanStack Query + Zustand wired in `providers.tsx`

### ❌ REMAINING — Frontend

| Task | Notes |
|---|---|
| Delete `hooks/useQueueSocket.ts.bak` | Stale backup file |

---

### ✅ DONE — Backend

**Modules** (each has controller / service / repository / routes / schema)
- `auth` — login, register, refresh token rotation, setup-password, invite flow
- `queue` — full queue engine: book, call next, skip, cancel, break windows, ETA recalc, SELECT FOR UPDATE SKIP LOCKED
- `departments` — CRUD, assign/remove doctors
- `doctors` — invite, manage, profile
- `tenants` — settings, update, plan info
- `clinics` — search public clinics
- `analytics` — peak hours, avg wait, volume per doctor
- `billing` — Stripe checkout, webhooks, payment_events idempotency, subscription lifecycle
- `super` — platform-wide dashboard: MRR, tenants, churn, usage, revenue
- `patients` — profile, history
- `push` — Web Push subscriptions (subscribe, unsubscribe, send)
- `support` — contact form + super admin message management
- `tracking` — public token tracking (unauthenticated queue position lookup)
- `realtime` — Socket.io gateway + Redis Pub/Sub (horizontal scale ready)

**Middleware**
- `authenticate` — JWT verification
- `requireRole` — role-based access control
- `resolveTenant` — injects tenant context from JWT
- `requireActiveSubscription` — blocks locked/expired tenants
- `featureGate` — plan-limit enforcement per action
- `usageMetering` — Redis counter per tenant per day
- `rateLimiter` — Redis sliding window per IP + user
- `auditLog` — immutable append-only audit trail

**Workers (BullMQ)**
- `noShow.worker` — auto-skip patients, recalculate ETAs
- `cancelled.worker` — cancelled token cleanup
- `pastDue.worker` — subscription past-due handling + grace period
- `push.worker` — Web Push notification delivery

**Database**
- 23 migrations: all core tables (users, tenants, subscriptions, departments, queue_tokens, appointments, audit_logs, push_subscriptions, payment_events, support_messages, contact_inquiries, activity_events, invoices)
- RLS enabled (migration 12) — multi-tenant isolation at DB level
- 5 seed files: subscription plans, patients, solo doctor tenant, clinic tenant, super admin

**Utils**
- `jwt.ts`, `password.ts`, `eta.ts` (ETA calculator), `email.ts`

**Config**
- `bullmq.ts`, `database.ts`, `redis.ts`, `webpush.ts`

**Health check**
- `GET /health` — basic liveness endpoint in `app.ts`

**Tests**
- `concurrentBooking.test.ts` — concurrent booking race condition (has content)
- `push.service.test.ts` — push unit test (has content)

### ❌ REMAINING — Backend

| Task | Priority | Notes |
|---|---|---|
| ~~`db/migrate.ts`~~ | ~~High~~ | ✅ DELETED — confirmed unnecessary, node-pg-migrate CLI handles migrations |
| ~~`queueProgression.test.ts`~~ | ~~High~~ | ✅ DONE — 5/5 tests passing (callNextToken returns pre-UPDATE row; use DB re-query) |
| ~~`tenantIsolation.test.ts`~~ | ~~High~~ | ✅ DONE — 11/11 tests passing (SET LOCAL ROLE mediqueue_app to bypass superuser exemption) |
| Docker + Docker Compose | High | No Dockerfile or docker-compose.yml in either repo — required for one-command demo |
| GitHub Actions CI | Medium | No `.github/` folder — lint + test + build pipeline |
| `GET /health/ready` | Low | Only `/health` (liveness) exists; readiness check (DB + Redis + BullMQ) not built |
| Swagger / OpenAPI docs | Low | Not built — would auto-document all endpoints |
