#!/usr/bin/env bash
# Starts the stand-ins (fakes), the gateway + API, and Vite for the e2e test. Logs in /var/tmp/fin-*.log
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
ANON=$(node -e "import('$HERE/keys.mjs').then(m=>console.log(m.ANON))")
SERVICE=$(node -e "import('$HERE/keys.mjs').then(m=>console.log(m.SERVICE))")
pkill -f "finance-e2e/fakes.mjs" ; pkill -f "finance-e2e/gateway.mjs" ; pkill -f "vite.e2e.config" ; sleep 1
FAKES=http://127.0.0.1:54400
nohup node "$HERE/fakes.mjs" > /var/tmp/fin-fakes.log 2>&1 &
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY="$SERVICE" \
ANTHROPIC_API_KEY=test-anthropic-key FINANCE_ANTHROPIC_API=$FAKES/claude \
GOOGLE_CLIENT_ID=test-google-client GOOGLE_CLIENT_SECRET=test-google-secret \
FINANCE_GOOGLE_OAUTH=$FAKES/google FINANCE_GOOGLE_AUTHORIZE=$FAKES/google/authorize FINANCE_GMAIL_API=$FAKES/gmail \
RESEND_API_KEY=test-resend FINANCE_RESEND_API=$FAKES/resend CRON_SECRET=test-cron SITE_URL=http://127.0.0.1:5180 \
nohup node "$HERE/gateway.mjs" > /var/tmp/fin-gateway.log 2>&1 &
cd "$ROOT" && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY="$ANON" nohup npx vite --config scripts/finance-e2e/vite.e2e.config.mjs > /var/tmp/fin-vite.log 2>&1 &
sleep 5; tail -1 /var/tmp/fin-fakes.log; tail -2 /var/tmp/fin-gateway.log; grep -m1 Local /var/tmp/fin-vite.log
