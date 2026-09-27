import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRouter from "./modules/auth/auth.routes.js";
import tenantsRouter from './modules/tenants/tenants.routes.js';
import patientsRouter from './modules/patients/patients.routes.js';
import doctorsRouter from './modules/doctors/doctors.routes.js';
import departmentsRouter from './modules/departments/departments.routes.js';
import clinicsRouter from './modules/clinics/clinics.routes.js';
import queueRouter from './modules/queue/queue.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';
import superRouter from './modules/super/super.routes.js';
import trackingRouter from './modules/tracking/tracking.routes.js';
import { resolveTenant } from './middleware/resolveTenant.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import billingRouter from './modules/billing/billing.routes.js';
import pushRouter from './modules/push/push.routes.js';
import supportRouter from './modules/support/support.routes.js';
import { requireActiveSubscription } from './middleware/requireActiveSubscription.js';
import healthRouter from './modules/health/health.routes.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

app.use(morgan("dev"));
const allowedOrigins = [
  "https://mediqueue.monjurhossen.online",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
  })
);
app.use(helmet());
// Stripe webhook needs raw body — mount BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// ── Health checks (no auth, no rate-limit) ────────────────────────────────
app.use('/health', healthRouter);

// ── Swagger UI (no auth) ─────────────────────────────────────────────────────
setupSwagger(app);
app.use(resolveTenant);
app.use(rateLimiter);

// ── Paywall: block expired/cancelled tenants from all routes except auth/billing/tracking ──
// Applied AFTER authenticate (which sets req.user). Routes that don't call authenticate
// first are unaffected because req.user will be undefined → middleware skips them.
const PAYWALL_SKIP = ['/api/auth', '/api/billing', '/api/track', '/api/support', '/api/docs'];
app.use((req, res, next) => {
  if (PAYWALL_SKIP.some((p) => req.path.startsWith(p))) return next();
  return requireActiveSubscription(req, res, next);
});

app.get("/", (req, res) => {
  res.json({ message: "MediQueue API" });
});


app.use("/api/auth", authRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/clinics', clinicsRouter);
app.use('/api/queue', queueRouter);
app.use('/api/billing', billingRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/super', superRouter);
app.use('/api/track', trackingRouter);
app.use('/api/push', pushRouter);
app.use('/api/support', supportRouter);

// This should palaced last
app.use('/api', departmentsRouter); // For handle Public routes

export default app;
