#!/usr/bin/env bash
# Restores a dump made by dump.sh into an EMPTY Supabase database, then checks that every table has
# exactly the rows the dump holds, and that the tables in REQUIRE_ROWS aren't empty.
#
# Prints only table names and row counts: the Actions logs of this public repo are public. A failed
# restore shows only where it failed unless SHOW_ERRORS=1 (rehearsals with made-up data).
#
# Usage: PSQL="<psql command>" restore-check.sh <dump-dir> <database-url>
#   PSQL="docker exec -i supabase_db_restore psql" restore-check.sh backup postgresql://postgres:postgres@localhost:5432/postgres
set -euo pipefail

dir="$1"
db_url="$2"
psql_cmd=(${PSQL:-psql})
require_rows="${REQUIRE_ROWS:-}"

# Same order and settings as the restore guide; the triggers stay off while the data loads.
echo "Restoring roles, schema and data…"
if ! { cat "$dir/roles.sql" "$dir/schema.sql"; echo "SET session_replication_role = replica;"; cat "$dir/data.sql"; } |
  "${psql_cmd[@]}" --quiet --single-transaction --variable ON_ERROR_STOP=1 --file - "$db_url" > /dev/null 2> "$dir/restore-errors.txt"; then
  if [ "${SHOW_ERRORS:-0}" = "1" ]; then
    cat "$dir/restore-errors.txt"
  else
    # "psql:<stdin>:1234: ERROR: …" → keep the location only; the message can quote row data.
    sed -nE 's/^(psql:[^:]*:[0-9]+): ERROR.*/Restore failed at \1 (message hidden: it can contain data)/p' "$dir/restore-errors.txt" | head -5
  fi
  exit 1
fi

# Rows per table in the dump: the lines between each "COPY <table> … FROM stdin;" and its "\.".
awk '/^COPY / { table = $2; rows = 0; inside = 1; next }
     inside && /^\\\.$/ { print table, rows; inside = 0; next }
     inside { rows++ }' "$dir/data.sql" > "$dir/expected-counts.txt"

if [ ! -s "$dir/expected-counts.txt" ]; then
  echo "The data dump holds no tables."
  exit 1
fi

status=0
printf '%-48s %10s %10s\n' "table" "dump" "restored"
while read -r table expected; do
  actual=$("${psql_cmd[@]}" --tuples-only --no-align --command "select count(*) from $table" "$db_url")
  name="${table//\"/}"
  mark=""
  if [ "$actual" != "$expected" ]; then
    mark="  MISMATCH"
    status=1
  fi
  printf '%-48s %10s %10s%s\n' "$name" "$expected" "$actual" "$mark"
done < "$dir/expected-counts.txt"

for table in $require_rows; do
  rows=$(awk -v t="$table" '{ name = $1; gsub(/"/, "", name) } name == t { print $2 }' "$dir/expected-counts.txt")
  if [ -z "$rows" ] || [ "$rows" -lt 1 ]; then
    echo "Expected rows in $table, but the dump has ${rows:-no such table}."
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "The restored database doesn't match the dump."
  exit 1
fi
echo "Restore check passed: $(wc -l < "$dir/expected-counts.txt") tables match the dump."
