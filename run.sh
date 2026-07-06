#!/usr/bin/env bash
# Start Financial Simulation Arena server on port 3004
# Usage: ./run.sh [--no-ticker] [--seed]

set -euo pipefail

cd "$(dirname "$0")"

TICKER="${START_TICKER_IN_DEV:-1}"
PORT="${PORT:-3004}"

# Parse args
for arg in "$@"; do
  case "$arg" in
    --no-ticker) TICKER=0 ;;
    --seed) bun run db:seed ;;
  esac
done

echo "🚀 Starting server on port $PORT (ticker=$TICKER)..."
PORT="$PORT" START_TICKER_IN_DEV="$TICKER" bun run dev
