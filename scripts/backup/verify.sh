#!/usr/bin/env bash
# Starts an empty local Supabase stack, restores a dump made by dump.sh into it and checks every
# table (restore-check.sh), then stops the stack. Needs the Supabase CLI and Docker.
#
# Restores as supabase_admin, the local superuser: the dump sets parameters (log_min_messages)
# that the local postgres role may not. This proves the data comes back whole; restoring into a
# hosted project is covered in docs/runbooks/restore.md.
#
# Usage: verify.sh <dump-dir>
set -euo pipefail

dir="$1"
here="$(cd "$(dirname "$0")" && pwd)"
work="${RUNNER_TEMP:-/tmp}/restore"
# Everything a restore needs from a Supabase project except the dashboard and functions.
excluded="${EXCLUDED_SERVICES:-studio,imgproxy,edge-runtime,logflare,vector,mailpit,supavisor,postgres-meta}"

mkdir -p "$work"
supabase init --workdir "$work" --force > /dev/null
sed -i 's/^project_id = .*/project_id = "restore"/' "$work/supabase/config.toml"
# Only the outcome: the start-up banner lists local keys and URLs that are noise in the logs.
supabase start --workdir "$work" -x "$excluded" > /dev/null
trap 'supabase stop --workdir "$work" --no-backup > /dev/null 2>&1 || true' EXIT

# "postgres" is the local stack's fixed default password, not a secret.
PSQL="docker exec -i supabase_db_restore psql" \
  bash "$here/restore-check.sh" "$dir" postgresql://supabase_admin:postgres@localhost:5432/postgres
