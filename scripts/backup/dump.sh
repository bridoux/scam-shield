#!/usr/bin/env bash
# Dumps a Supabase database the way docs/runbooks/restore.md restores it: roles, schema, then data
# in COPY format (including sign-in accounts in auth). Needs the Supabase CLI and Docker.
#
# Usage: dump.sh <output-dir> <connection flags for "supabase db dump">
#   dump.sh backup --db-url "$PRODUCTION_DB_URL"
#   dump.sh backup --local
set -euo pipefail

out="$1"
shift
mkdir -p "$out"

supabase db dump "$@" --role-only -f "$out/roles.sql"
supabase db dump "$@" -f "$out/schema.sql"
supabase db dump "$@" --data-only --use-copy -f "$out/data.sql"

ls -l "$out"
