#!/usr/bin/env bash
# One-liner wrapper around scripts/loadtest.k6.js.
#
# Mints a short-lived WS_TOKEN from JWT_SECRET, then runs k6 against the
# staging URL. The only thing you must provide is BASE_URL (and JWT_SECRET
# in the environment — same value the staging server uses).
#
# Usage:
#   BASE_URL=https://staging.surna.replit.app \
#   JWT_SECRET=... \
#   VUS=500 DURATION=5m \
#   bash scripts/run-loadtest.sh
#
# Optional env:
#   WS_URL                 defaults to BASE_URL with http→ws
#   LOADTEST_USER_ID       sub claim for the minted JWT (default: loadtest-user)
#   LOADTEST_USERNAME      username claim                (default: loadtest)
#   LOADTEST_TOKEN_TTL     JWT lifetime                  (default: 2h)
#   VUS                    peak virtual users            (default: 500)
#   DURATION               sustain phase length          (default: 5m)
set -euo pipefail

if ! command -v k6 >/dev/null 2>&1; then
  echo "[run-loadtest] k6 is not installed. Install it from https://k6.io/docs/get-started/installation/ then re-run." >&2
  exit 1
fi

if [ -z "${BASE_URL:-}" ]; then
  echo "[run-loadtest] BASE_URL is required (e.g. https://staging.surna.replit.app)." >&2
  exit 1
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "[run-loadtest] JWT_SECRET is required — must match the staging server's JWT_SECRET." >&2
  exit 1
fi

WS_URL="${WS_URL:-${BASE_URL/http/ws}}"

echo "[run-loadtest] minting WS_TOKEN…"
WS_TOKEN="$(npx --yes tsx scripts/loadtest-token.ts)"
export WS_TOKEN BASE_URL WS_URL

echo "[run-loadtest] BASE_URL=$BASE_URL WS_URL=$WS_URL VUS=${VUS:-500} DURATION=${DURATION:-5m}"
exec k6 run scripts/loadtest.k6.js
