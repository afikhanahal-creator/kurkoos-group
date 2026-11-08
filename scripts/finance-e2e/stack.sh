#!/usr/bin/env bash
# Starts the local Supabase stand-in for the finance end-to-end test:
#   Postgres 16 (host, :54329) · GoTrue :9999 · PostgREST :3000 · Storage :5000 · gateway :54321
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SECRET=$(node -e "import('$HERE/keys.mjs').then(m=>console.log(m.JWT_SECRET))")
ANON=$(node -e "import('$HERE/keys.mjs').then(m=>console.log(m.ANON))")
SERVICE=$(node -e "import('$HERE/keys.mjs').then(m=>console.log(m.SERVICE))")
docker rm -f fin-auth fin-rest fin-storage >/dev/null 2>&1 || true
docker run -d --name fin-auth --network host \
  -e GOTRUE_API_HOST=127.0.0.1 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1 \
  -e GOTRUE_DB_DRIVER=postgres -e "GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:pw@127.0.0.1:54329/postgres?search_path=auth" \
  -e GOTRUE_SITE_URL=http://127.0.0.1:5180 -e GOTRUE_URI_ALLOW_LIST='*' -e GOTRUE_DISABLE_SIGNUP=false \
  -e GOTRUE_JWT_SECRET="$SECRET" -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
  -e GOTRUE_SMTP_HOST=127.0.0.1 -e GOTRUE_SMTP_PORT=2525 -e GOTRUE_SMTP_ADMIN_EMAIL=auth@kurkoos.test -e GOTRUE_SMTP_SENDER_NAME=Kurkoos \
  -e GOTRUE_MAILER_URLPATHS_INVITE=/auth/v1/verify -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 \
  supabase/gotrue:v2.177.0 >/dev/null
docker run -d --name fin-rest --network host \
  -e PGRST_DB_URI=postgres://authenticator:pw@127.0.0.1:54329/postgres -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="$SECRET" -e PGRST_SERVER_PORT=3000 -e PGRST_DB_USE_LEGACY_GUCS=false \
  postgrest/postgrest:v12.2.3 >/dev/null
mkdir -p /var/tmp/finstore && chmod 777 /var/tmp/finstore
docker run -d --name fin-storage --network host -v /var/tmp/finstore:/var/lib/storage \
  -e ANON_KEY="$ANON" -e SERVICE_KEY="$SERVICE" -e AUTH_JWT_SECRET="$SECRET" -e PGRST_JWT_SECRET="$SECRET" \
  -e DATABASE_URL=postgres://supabase_storage_admin:pw@127.0.0.1:54329/postgres -e DB_INSTALL_ROLES=false \
  -e FILE_SIZE_LIMIT=52428800 -e STORAGE_BACKEND=file -e FILE_STORAGE_BACKEND_PATH=/var/lib/storage \
  -e TENANT_ID=stub -e REGION=local -e GLOBAL_S3_BUCKET=stub -e SERVER_PORT=5000 -e PORT=5000 -e POSTGREST_URL=http://127.0.0.1:3000 \
  supabase/storage-api:v1.25.7 >/dev/null
echo "stack starting"
