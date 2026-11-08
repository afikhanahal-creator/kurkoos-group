#!/usr/bin/env bash
# Local Postgres 16 for the e2e test (port 54329, trust auth, data in /var/tmp/finpg). Run as root; it switches to "postgres".
set -e
D=/var/tmp/finpg; BIN=/usr/lib/postgresql/16/bin
if [ ! -d $D/data ]; then mkdir -p $D && chown postgres:postgres $D && su postgres -s /bin/bash -c "$BIN/initdb -D $D/data -U postgres --auth=trust -E UTF8 --locale=C.UTF-8" >/dev/null; fi
su postgres -s /bin/bash -c "$BIN/pg_ctl -D $D/data -o '-p 54329 -c listen_addresses=127.0.0.1' -l $D/log start" || true
