# Member management

Owners need to keep the member list true: people leave, change jobs and move between teams. Until now the team page only listed members.

## Decisions (Eric, 2026-10-28)
- **Removing someone deactivates them.** They lose access at once and drop out of the league and the 80% target from that day. Their past rounds stay in training records, marked "Left on <date>". Owners and admins can reactivate them.
- **Permissions:** the owner can change anyone's role, team or status. Admins can move and deactivate players and manage teams, but can't touch other admins or the owner. Nobody can deactivate or demote the owner, and nobody acts on themselves except to change their own team.
- **Ownership transfer is included.** The owner can make an admin the new owner, with a confirm step; the old owner becomes an admin.
- **Teams:** create and rename freely; delete only a team with no active members on it.

## Scope
1. Database
   - `memberships.deactivated_at`. Deactivated members fail every membership check (RLS helpers, play, league, reports, invites).
   - Members can always read their own membership row, so the app can tell them their access was turned off.
   - Functions: `set_member_role`, `set_member_team`, `set_member_active`, `transfer_ownership`. Each is security definer, scoped to the caller's company and checks the permission rules above.
   - Team writes limited to the name column; the delete policy only allows teams with no active members.
   - `accept_invite` never reactivates a deactivated member (an old link must not undo a removal).
   - `training_report` returns `left_on`; members who left before the period are left out. `weekly_league` leaves deactivated members out.
2. Team page: a Teams panel (add, rename, delete empty) and a manageable member list (team, role, deactivate, make owner), plus a "Former members" list with Reactivate.
3. Records: required training days stop the day before someone left. The dashboard, PDF and CSV show "Left on".
4. A deactivated person who signs in sees a short notice instead of the company.

## Not in scope
- Editing someone else's display name, or removing a person's data entirely (that is item 4, account deletion).
- Days between deactivation and reactivation still count as training days; reactivation is expected to be rare.
