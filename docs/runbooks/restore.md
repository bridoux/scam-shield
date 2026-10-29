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

Work in a folder **outside OneDrive** (the repo is inside it): the decrypted files hold personal data and must not be synced anywhere.

1. **Download** into that folder. GitHub → Actions → Backup → the run for the night you want → Artifacts → `database-backup-YYYY-MM-DD.tar.gz.gpg` (GitHub wraps it in a zip; unzip it). Or in Git Bash:
   ```
   mkdir -p ~/ssrestore && cd ~/ssrestore
   gh run download <run id> --repo bridoux/scam-shield --dir .
   ```
2. **Decrypt** in Git Bash, with a short temporary keyring (copy the private key file into `~/ssrestore` first):
   ```
   mkdir -p ~/.sskeys && chmod 700 ~/.sskeys
   gpg --homedir ~/.sskeys --batch --import scam-shield-backup-private-key.asc
   gpg --homedir ~/.sskeys --batch --pinentry-mode loopback --decrypt database-backup-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz
   tar -xzf backup.tar.gz && rm backup.tar.gz scam-shield-backup-private-key.asc
   gpgconf --homedir ~/.sskeys --kill gpg-agent; rm -rf ~/.sskeys
   ```
   If you gave the key a passphrase, gpg asks for it. You now have `roles.sql`, `schema.sql`, `data.sql` and `expected-counts.txt`. When you're done, delete the whole folder: `rm -rf ~/ssrestore`.
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
- **The `production` environment.** The secret belongs to an environment only the main branch can use, so a workflow edited on another branch can't read it. Set it up once:
  1. GitHub → bridoux/scam-shield → Settings → Environments → **New environment** → `production`.
  2. Under Deployment branches and tags, choose **Selected branches and tags** and add `main`.
- **`PRODUCTION_DB_URL` secret.** Supabase → ScamShield US → Connect → Session pooler (port 5432), with the database password filled in. If the password has characters like `@ : / ? # %`, URL-encode them (for example `@` becomes `%40`). If you don't know the password, reset it under Database → Settings; the app doesn't use it. Then:
  ```
  gh secret set PRODUCTION_DB_URL --env production --repo bridoux/scam-shield
  ```
  This asks for the value, so it doesn't end up in your shell history. Don't also add it as a repository secret: those reach every branch.
- **Protect `main`** so changes to the backup workflow, scripts or `ops/` go through a pull request (Settings → Branches → add a rule for `main` requiring a pull request).
- **The private key** decrypts every off-site backup, and the artifacts of a public repo can be downloaded by any GitHub user, so the key is what protects them. Keep it in the password manager and one offline copy. You can add a passphrase (`gpg --homedir ~/.sskeys --passwd backups@scam-shield.invalid` after importing it, then export it again). If the key is lost, make a new key pair, replace `ops/backup-public-key.asc` and `BACKUP_KEY_FINGERPRINT` in the workflow, and accept that older backups can't be read.
- **Not yet tried:** a restore into a hosted Supabase project (part B, step 4). The nightly check restores into a local copy as its superuser. Do one drill into a throwaway project after setup; it costs a few cents of project time.
- **Failures:** a failed Backup run emails the repository owner. Fix it the same day, because Supabase only keeps 7 days.
- **GitHub pauses scheduled workflows** after 60 days without commits. Re-enable Backup and Uptime from the Actions tab if that happens.
