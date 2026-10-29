# Restoring the database

There are two kinds of backup (docs/sprints/backups.md):

| | Supabase daily backups | Off-site backups |
|---|---|---|
| Where | Inside the Supabase project | GitHub Actions artifacts, encrypted |
| Kept | 7 days | 30 days |
| Survives losing the project or account | No | Yes |
| Restore | One click in the dashboard | About 30 minutes, this guide |

Pick the newest backup from **before** the damage. Everything after it is lost, so note what happened since (new members, rounds played) to tell customers.

## A. Recent damage: Supabase's daily backup (up to 7 days old)
1. Supabase dashboard → project **ScamShield US** → Database → Backups → Scheduled backups.
2. Choose the backup and **Restore**. The whole database is replaced, and the site is unavailable for a few minutes.
3. Check the live site: sign in, open the dashboard, download a training record.

## B. Off-site backup (project or account lost, or damage older than 7 days)
You need the private key (`scam-shield-backup-private-key.asc`, from the password manager) and Git Bash on Windows. Git Bash includes `gpg`.

1. **Download.** GitHub → Actions → Backup → the run for the night you want → Artifacts → `database-backup-YYYY-MM-DD.tar.gz.gpg`. GitHub wraps it in a zip; unzip it. Or, in a terminal:
   ```
   gh run download <run id> --repo bridoux/scam-shield --dir restore
   ```
2. **Decrypt** in Git Bash, with a short temporary keyring:
   ```
   mkdir -p ~/.ssrestore && chmod 700 ~/.ssrestore
   gpg --homedir ~/.ssrestore --batch --import scam-shield-backup-private-key.asc
   gpg --homedir ~/.ssrestore --batch --decrypt database-backup-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz
   tar -xzf backup.tar.gz
   gpgconf --homedir ~/.ssrestore --kill gpg-agent; rm -rf ~/.ssrestore
   ```
   You now have `roles.sql`, `schema.sql`, `data.sql` and `expected-counts.txt`. They contain personal data: keep them off shared folders (not OneDrive), and delete them when done.
3. **Create a new Supabase project** in US East (or reuse the damaged one, but only after emptying its `public` and `private` schemas). Copy its connection string: Connect → Session pooler.
4. **Restore** with `psql` 17. On Windows, install the PostgreSQL 17 "Command Line Tools" from the EDB installer.
   ```
   psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command "SET session_replication_role = replica" --file data.sql --dbname "<new connection string>"
   ```
5. **Check** that each table's row count matches `expected-counts.txt` (`select count(*) from public.memberships;` and so on).
6. **Point the app at it** (new project only):
   - Vercel → scam-shield → Settings → Environment Variables (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Then redeploy.
   - New project → Authentication → URL configuration: same site URL and redirect URLs as before (see CLAUDE.md).
   - Repo: `PRODUCTION_PROJECT_REF` in `tests/guard.ts`, the `db:types` script in `package.json`, and the `PRODUCTION_DB_URL` secret.
   - Everyone has to sign in again (old sessions don't carry over). Their accounts, companies and training history are back.

## C. Getting back a few rows
Restore the off-site backup (steps B1–B4) into a temporary Supabase project, never the test project. Copy the rows you need with SQL, then delete the temporary project.

## Setup and care
- **`PRODUCTION_DB_URL` secret.** Supabase → ScamShield US → Connect → Session pooler (port 5432), with the database password filled in. If you don't know the password, reset it under Database → Settings; the app doesn't use it. Then:
  ```
  gh secret set PRODUCTION_DB_URL --repo bridoux/scam-shield
  ```
  This asks for the value, so it doesn't end up in your shell history.
- **The private key** decrypts every off-site backup. Keep it in the password manager and one offline copy. If it's lost, make a new key pair, replace `ops/backup-public-key.asc`, and accept that older backups can't be read.
- **Failures:** a failed Backup run emails the repository owner. Fix it the same day, because Supabase only keeps 7 days.
- **GitHub pauses scheduled workflows** after 60 days without commits. Re-enable Backup and Uptime from the Actions tab if that happens.
