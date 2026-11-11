#!/usr/bin/env bash
# Starts the finance preview on port 5181 (see vite.preview.config.mjs). Needs pg.sh, stack.sh and services.sh first.
# Sign in at /admin/finance with admin@kurkoos.test / Passw0rd!x (local test data only).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ANON="$(cd "$ROOT" && node -e "import('./scripts/finance-e2e/keys.mjs').then((m) => console.log(m.ANON))")"
pkill -f "vite.preview.config" || true; sleep 1
cd "$ROOT" && VITE_SUPABASE_ANON_KEY="$ANON" nohup npx vite --config scripts/finance-e2e/vite.preview.config.mjs > /var/tmp/fin-preview.log 2>&1 &
sleep 5; grep -m1 -E "Local|error" /var/tmp/fin-preview.log || tail -3 /var/tmp/fin-preview.log
