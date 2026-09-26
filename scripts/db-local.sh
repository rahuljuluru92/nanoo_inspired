#!/usr/bin/env bash
# Project-local Postgres 15 cluster (never touches any other Postgres on the machine).
#   scripts/db-local.sh start|stop|status|reset
# Same port as Supabase's local DB (54322) so DATABASE_URL matches the usual convention.
set -euo pipefail
# macOS: postgres refuses to start ("became multithreaded") unless a valid locale is set.
export LC_ALL="en_US.UTF-8" LANG="en_US.UTF-8"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@15/bin}"
DATA="$ROOT/.local/pg"
SOCK="$ROOT/.local/sock"
PORT="${PGPORT_LOCAL:-54322}"
mkdir -p "$SOCK"

start() {
  if [ ! -d "$DATA" ]; then
    "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust --encoding=UTF8 --locale=en_US.UTF-8 >/dev/null
    echo "initialised cluster in .local/pg"
  fi
  if "$PGBIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then echo "already running on :$PORT"; return; fi
  "$PGBIN/pg_ctl" -D "$DATA" -l "$ROOT/.local/pg.log" -w \
    -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$SOCK" start >/dev/null
  "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -tAc "select 1 from pg_database where datname='byline'" | grep -q 1 \
    || "$PGBIN/createdb" -h 127.0.0.1 -p "$PORT" -U postgres byline
  echo "running: postgres://postgres@127.0.0.1:$PORT/byline"
}
stop() { "$PGBIN/pg_ctl" -D "$DATA" stop -m fast >/dev/null 2>&1 && echo stopped || echo "not running"; }
status() { "$PGBIN/pg_ctl" -D "$DATA" status 2>&1 | head -1; }
reset() {
  stop || true
  rm -rf "$DATA"
  start
}
"${1:-status}"
