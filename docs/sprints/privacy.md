# Privacy, terms and deletion

Before the first paying company, Scam Shield needs plain legal pages and a way for people to remove their data themselves.

## Decisions (Eric, 2026-10-29)
- **Legal pages use placeholders** (`[COMPANY NAME]`, `[CONTACT EMAIL]`, `[ADDRESS]`, `[STATE]`, `[EFFECTIVE DATE]`), highlighted on the page, to be filled in (ideally with a lawyer) before the first paying customer. The pages describe what the app actually does; they are drafts, not legal advice.
- **Employees can delete their own account, fully:** sign-in, name and every round are erased. Past PDFs the owner already downloaded are unaffected. The owner must hand over ownership or delete the company first.
- **Owners can delete the whole company** by typing its name: the company, teams, invites and all rounds are erased. People keep a sign-in with no company and can join another one.
- **A Data Processing Addendum page** for business customers.

## Scope
1. `/privacy`, `/terms` and `/dpa`, rendered from `src/data/legal.en-US.json`. A footer on every page links to them, and the sign-in page says that signing in accepts the terms.
2. `/account`: the signed-in person's details, **Delete my account**, and (for the owner) **Delete company**. Both need a typed confirmation. It also works for people whose access was turned off, which is their way to start over with another company.
3. Database: `delete_organization(confirm_name)` (active owner only, exact name match). Account deletion uses the auth admin API from server code; existing foreign keys cascade memberships, rounds and answers.

## Facts the pages rely on (keep them true)
- Data: work email, display name, company name, industry, time zone and training days, team, role, and training activity (rounds, answers, points, dates). Invite links record who created them.
- Seen by: the employer's owners and admins (dashboard and exports, including email); colleagues see name, team and weekly points in the league.
- Cookies: only the sign-in session cookie. No analytics, advertising or tracking SDKs. Nothing is sold or shared for advertising.
- Sub-processors: Supabase (database, authentication and sign-in emails, US East) and Vercel (hosting, US).
- Backups: Supabase keeps daily backups for 7 days, so deleted data leaves backups within 7 days.
