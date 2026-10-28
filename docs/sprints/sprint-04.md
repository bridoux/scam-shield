# Sprint 4 — Owner dashboard, training record PDF, CSV export

## Goal
Give owners proof that their team is being trained: a dashboard that shows who is keeping up and where the team struggles, and an audit-ready training record (PDF and CSV) they can hand to an auditor, cyber insurer or examiner under the FTC Safeguards Rule.

## Decisions (Eric, 2026-10-27)
- **Access: owners and admins.** Players never see colleagues' results.
- **PDF: generated file.** A "Download PDF" button returns a consistent, branded document, not a browser print.
- **Target: 80% of training days.** Completion = days with a completed record round ÷ the company's training days in the period since the employee joined. Below 80% is "Behind"; no training days yet is "New".
- **Identity: name and email** in the PDF and CSV. Emails stay in Supabase Auth (not copied into app tables) and are read only through an owner/admin-only database function.
- **Practice rounds never count** toward the record.

## Done means
- `/dashboard` (owners and admins) with a period picker: last 30 days (default), last 90 days, last 12 months, or a custom range up to 366 days. It shows:
  - summary: employees, on track / behind / new, average completion, average accuracy, rounds completed;
  - an employee table: name, team, training days required vs completed, completion, accuracy, last played, status. "Behind" is listed first;
  - "Where the team struggles": accuracy by scam type, weakest first;
  - "Download PDF" and "Download CSV" for the same period.
- **Training record PDF:**
  - header: company, period, the company's training days, generation time;
  - summary block and the per-employee table (name, email, team, joined, required/completed days, completion, accuracy, status);
  - the topics covered (scam types practised, with counts);
  - a short methodology note and an attestation block (prepared by, signature, date);
  - page numbers and repeated table headers on every page. Works for 250 employees and for names with accents.
- **CSV:** one row per employee with the same columns as the PDF table, safe to open in Excel (formula-injection guarded).
- A player who opens `/dashboard` or an export URL gets no data. A test proves owners and admins of company A can't read company B's record.

## Tasks
1. **Migration:**
   - `training_report(p_from, p_to)`: owner/admin only. Returns, for each member of the caller's company: name, email, team, role, local join date, the record-round dates in the period, cards answered, cards correct and points.
   - `training_topics(p_from, p_to)`: attempts and misses per scam type for the company's record rounds in the period.
2. **Pure logic** (unit-tested):
   - `period.ts`: parse and validate the period from the URL.
   - `record.ts`: required days, completion, accuracy, status, summary and topics.
   - `csv.ts`: escaping and formula guard.
   - `pdf.ts`: pdf-lib rendering with pagination and WinAnsi-safe text.
3. **UI:** the `/dashboard` page, a "Dashboard" link in the account menu for owners and admins, and two download route handlers.
4. **Tests:**
   - Unit tests for the logic and PDF generation (valid PDF, multi-page, accents).
   - DB tests: players are refused; cross-company is impossible; practice rounds are excluded.
   - e2e: an owner sees the dashboard and downloads both files; a player can't.

## Out of scope
Scheduled or emailed reports, per-round detail exports, company logo upload, billing (Sprint 5).
