#!/usr/bin/env bash
# Start Financial Simulation Arena server on port 3004
# Usage: ./run.sh [--no-ticker] [--seed] [--skip-migrate]

set -euo pipefail

cd "$(dirname "$0")"

TICKER="${START_TICKER_IN_DEV:-1}"
PORT="${PORT:-3004}"
SEED=0
SKIP_MIGRATE=0

# Parse args
for arg in "$@"; do
  case "$arg" in
    --no-ticker) TICKER=0 ;;
    --seed) SEED=1 ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
    -h|--help)
      echo "Usage: $0 [--no-ticker] [--seed] [--skip-migrate]"
      echo ""
      echo "  --no-ticker     Run server without the simulation tick engine."
      echo "  --seed          Run prisma db seed after migrations."
      echo "  --skip-migrate  Skip prisma migrate deploy (use only if you know the schema is current)."
      exit 0
      ;;
  esac
done

echo "🚀 Starting server on port $PORT (ticker=$TICKER)"

# ── 1. Ensure Prisma client matches schema ──────────────────────────────
# cheap (~200ms) and a no-op if client is current. Guarantees
# the running process never sees a stale client after a schema change.
echo "🔧 Generating Prisma client..."
bunx prisma generate >/dev/null

# ── 2. Apply pending migrations ────────────────────────────────────────
# prisma migrate deploy is non-destructive (no shadow DB, safe in prod).
# It applies only migrations not yet in _prisma_migrations and errors if any
# pending migration fails — server will not start in that case.
if [ "$SKIP_MIGRATE" -eq 1 ]; then
  echo "⚠️  Skipping prisma migrate deploy (--skip-migrate)."
else
  echo "🗃️  Applying pending migrations..."
  bunx prisma migrate deploy
fi

# ── 3. Optional seed ────────────────────────────────────────────────────
if [ "$SEED" -eq 1 ]; then
  echo "🌱 Seeding database..."
  bun run db:seed
fi

# ── 4. Start server ─────────────────────────────────────────────────────
echo "▶️  Launching server..."
PORT="$PORT" START_TICKER_IN_DEV="$TICKER" bun run dev
