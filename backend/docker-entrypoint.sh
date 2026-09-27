#!/bin/sh
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     MediQueue Backend Startup        ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Run Migrations ──────────────────────────────────────────────────────────
echo "🔄  Running database migrations …"
node_modules/.bin/node-pg-migrate up \
  --migrations-dir src/db/migrations \
  --ignore-pattern '.*\.ts$'
echo "✅  Migrations complete"
echo ""

# ── 2. Always-on seeds (idempotent — safe to repeat) ──────────────────────────
echo "🌱  Seeding subscription plans …"
node src/db/seeds/01_subscription_plans.js

echo "👑  Seeding super admin …"
node src/db/seeds/05_super_admin.js
echo ""

# ── 3. Demo data (opt-in via SEED_DEMO=true) ──────────────────────────────────
if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "🏥  Seeding demo tenants …"
  node src/db/seeds/03_solo_doctor_tenants.js
  node src/db/seeds/04_clinic_tenants.js

  echo "🧑‍🤝‍🧑  Seeding demo patients …"
  node src/db/seeds/02_patients.js
  echo ""
fi

# ── 4. Start server ────────────────────────────────────────────────────────────
echo "🚀  Starting MediQueue backend on port ${PORT:-5001} …"
exec node dist/server.js
