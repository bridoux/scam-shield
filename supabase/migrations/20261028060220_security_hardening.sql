-- Hardening after the Sprint 2 security review.

-- Owners/admins may rename their company, but not change its time zone (that decides
-- which day a round counts for) or industry. Companies are created only via create_organization.
revoke insert, update, delete on public.organizations from authenticated;
grant update (name) on public.organizations to authenticated;

-- Clients choose only the company and team for an invite (RLS pins created_by to themselves);
-- token, role and expiry always come from the defaults.
revoke insert, update on public.invites from authenticated;
grant insert (organization_id, team_id, created_by) on public.invites to authenticated;
alter table public.invites
  add constraint invites_token_format check (token ~ '^[0-9a-f]{64}$'),
  add constraint invites_max_lifetime check (expires_at <= created_at + interval '30 days');

-- Memberships come from the onboarding functions; rounds and answers from server code only.
-- RLS already blocks these writes (no policies); revoking the grants is defence in depth.
revoke insert, update, delete on public.memberships, public.rounds, public.round_answers from authenticated;
