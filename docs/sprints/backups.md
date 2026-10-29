# Backups

Pilot readiness: training records are what customers pay for, so losing them can't depend on a single provider, and a backup only counts once it has been restored.

## Today
- Supabase (Pro plan) takes a physical backup of production every day and keeps 7. Point-in-time recovery is off ($100/month add-on, not needed yet).
- Those backups live inside the Supabase project. Deleting the project or losing the account loses them too.
- No restore has ever been tried.

## Decisions (Eric, 2026-10-29)
- **An encrypted off-site copy every night, kept 30 days, as GitHub Actions artifacts.** No new account, and free on a public repo.
- **Encrypted with a key only Eric holds.** It's a GPG key pair generated on Eric's PC. The public half is in the repo (`ops/backup-public-key.asc`); the private half goes to his password manager. GitHub, the workflow and Claude can't read the backups.
- **Every backup is restored before it is kept.** The nightly job restores the dump into a throwaway local Supabase database and checks that every table has the same number of rows as the dump. If that fails, no artifact is uploaded and GitHub emails Eric.

## Scope
1. **Workflow** `.github/workflows/backup.yml`, nightly at 03:00 UTC, can also be run by hand:
   - Dump production with the Supabase CLI: roles, schema, and data (`COPY` format, including sign-in accounts in `auth`).
   - Start a local Supabase stack (database and auth only) on the runner, restore the dump with `psql` exactly as the restore guide says, and compare row counts table by table with the dump.
   - Sanity checks: the dump has the scenario cards, at least one company and at least one member.
   - Encrypt the three files with the public key, then upload one artifact (`database-backup-<date>`) kept 30 days.
   - Only on the main repository. Nothing from the data is printed to the public logs: only table names and row counts.
2. **Secret:** `PRODUCTION_DB_URL`, the session pooler connection string (IPv4) with the database password. Eric adds it; Claude Code can't write secrets.
3. **Restore guide** `docs/runbooks/restore.md`:
   - Recent damage (up to 7 days): restore Supabase's daily backup from the dashboard.
   - Supabase project or account lost, or damage older than 7 days: download the artifact, decrypt it, restore into a new Supabase project with `psql`, then point Vercel at it.
   - Recovering a few rows: restore into a local database and copy them back.
4. **Privacy policy and DPA:** deleted information leaves all backups within 30 days, and GitHub is listed as storing encrypted backups it can't read.

## Setup (operator)
1. Move the private key file into the password manager, keep a second copy somewhere safe offline, then delete the file. Without it the off-site backups can't be read.
2. Add the `PRODUCTION_DB_URL` repository secret.
3. Run the Backup workflow once by hand and check it's green.
