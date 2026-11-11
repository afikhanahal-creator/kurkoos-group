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
FINANCE_GOOGLE_USERINFO=$FAKES/google/userinfo FINANCE_DRIVE_API=$FAKES/drive FINANCE_DRIVE_UPLOAD=$FAKES/drive-upload FINANCE_DRIVE_RESUMABLE_FROM=22000 FINANCE_SCAN_ON_CONNECT=0 FINANCE_NIGHT_CHECK=0 \
FINANCE_DROPBOX_AUTH=$FAKES/dropbox/authorize FINANCE_DROPBOX_API=$FAKES/dropbox/api FINANCE_DROPBOX_CONTENT=$FAKES/dropbox/content DROPBOX_APP_KEY=test-dropbox-key DROPBOX_APP_SECRET=test-dropbox-secret \
GREENAPI_BASE=$FAKES/green GREENAPI_ID_INSTANCE=1101 GREENAPI_TOKEN=test-green FINANCE_WHATSAPP_WEBHOOK_TOKEN=test-wa-hook FINANCE_WHATSAPP_NUMBER=972501234567 FINANCE_WHATSAPP_FORWARD_URL=$FAKES/hook?wa=1 FINANCE_WHATSAPP_FORWARD_TOKEN=test-other-system FINANCE_WA_MEDIA_HOSTS=127.0.0.1 FINANCE_ALLOW_PRIVATE_WEBHOOKS=1 \
RESEND_API_KEY=test-resend FINANCE_RESEND_API=$FAKES/resend CRON_SECRET=test-cron SITE_URL=http://127.0.0.1:5180 \
nohup node "$HERE/gateway.mjs" > /var/tmp/fin-gateway.log 2>&1 &
cd "$ROOT" && VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY="$ANON" nohup npx vite --config scripts/finance-e2e/vite.e2e.config.mjs > /var/tmp/fin-vite.log 2>&1 &
sleep 5; tail -1 /var/tmp/fin-fakes.log; tail -2 /var/tmp/fin-gateway.log; grep -m1 Local /var/tmp/fin-vite.log
