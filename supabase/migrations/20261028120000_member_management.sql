-- Member management: deactivate members, change roles and teams, transfer ownership, manage teams.
--
-- Rules (docs/sprints/members.md)
--   * The owner can change anyone's role, team or status. Admins can move and deactivate
--     players only. Nobody can deactivate or demote the owner, and nobody acts on
--     themselves except to change their own team.
--   * Deactivating keeps the membership row, so past rounds stay in training records.
--     A deactivated member fails every membership check below.

alter table public.memberships add column deactivated_at timestamptz;

-- Exactly one owner per company (transfer_ownership demotes before it promotes).
create unique index memberships_one_owner on public.memberships (organization_id) where role = 'owner';

-- ---------------------------------------------------------------------------
-- Membership checks ignore deactivated members
-- ---------------------------------------------------------------------------

create or replace function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.organization_id = org and m.deactivated_at is null
  );
$$;

create or replace function private.has_role(org uuid, roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.organization_id = org and m.role = any (roles)
      and m.deactivated_at is null
  );
$$;

-- People can always read their own row, so the app can tell a deactivated member why.
create policy "people read their own membership" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Teams: clients write only the name; only teams with no active members can be deleted
-- ---------------------------------------------------------------------------

revoke insert, update on public.teams from authenticated;
grant insert (organization_id, name) on public.teams to authenticated;
grant update (name) on public.teams to authenticated;

drop policy "owners and admins remove teams" on public.teams;
create policy "owners and admins remove empty teams" on public.teams
  for delete to authenticated
  using (
    (select private.has_role(organization_id, array['owner', 'admin']))
    and not exists (
      select 1 from public.memberships m where m.team_id = teams.id and m.deactivated_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- Management functions
-- ---------------------------------------------------------------------------

-- The caller's membership, if they are an active owner or admin. Rows are locked (for update)
-- so a concurrent role change, transfer or deactivation can't act on a stale read.
create function private.caller_manager() returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships;
begin
  select * into me from public.memberships
  where user_id = (select auth.uid()) and deactivated_at is null and role in ('owner', 'admin')
  for update;
  if not found then
    raise exception 'only owners and admins can manage members' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  return me;
end;
$$;

-- Another member of the caller's company whom the caller may manage.
create function private.managed_member(me public.memberships, target uuid) returns public.memberships
language plpgsql security definer set search_path = '' as $$
declare
  them public.memberships;
begin
  select * into them from public.memberships where user_id = target and organization_id = me.organization_id for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0001', hint = 'not_found';
  end if;
  if them.user_id = me.user_id or them.role = 'owner' or (me.role = 'admin' and them.role <> 'player') then
    raise exception 'not allowed for this member' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  return them;
end;
$$;

-- Owner only: make an active member an admin or a player.
create function public.set_member_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships := private.caller_manager();
  them public.memberships;
begin
  if me.role <> 'owner' then
    raise exception 'only the owner can change roles' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  if new_role is null or new_role not in ('admin', 'player') then
    raise exception 'invalid role' using errcode = 'P0001', hint = 'invalid';
  end if;
  them := private.managed_member(me, target);
  if them.deactivated_at is not null then
    raise exception 'member is deactivated' using errcode = 'P0001', hint = 'deactivated';
  end if;
  update public.memberships set role = new_role
  where user_id = them.user_id and role <> 'owner' and deactivated_at is null;
end;
$$;

-- Move an active member (or yourself) to one of the company's teams, or to no team (null).
create function public.set_member_team(target uuid, new_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships := private.caller_manager();
  them public.memberships;
begin
  if target = me.user_id then
    them := me;
  else
    them := private.managed_member(me, target);
  end if;
  if them.deactivated_at is not null then
    raise exception 'member is deactivated' using errcode = 'P0001', hint = 'deactivated';
  end if;
  if new_team is not null
     and not exists (select 1 from public.teams where id = new_team and organization_id = me.organization_id) then
    raise exception 'team not found' using errcode = 'P0001', hint = 'invalid';
  end if;
  update public.memberships set team_id = new_team where user_id = them.user_id;
end;
$$;

-- Deactivate (active = false) or reactivate a member. The first deactivation date is kept.
create function public.set_member_active(target uuid, active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships := private.caller_manager();
  them public.memberships := private.managed_member(me, target);
begin
  if active is null then
    raise exception 'invalid status' using errcode = 'P0001', hint = 'invalid';
  end if;
  update public.memberships
  set deactivated_at = case when active then null else coalesce(deactivated_at, now()) end
  where user_id = them.user_id and role <> 'owner';
end;
$$;

-- Owner only: hand ownership to an active admin; the old owner becomes an admin.
create function public.transfer_ownership(new_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships := private.caller_manager();
begin
  if me.role <> 'owner' then
    raise exception 'only the owner can transfer ownership' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  -- caller_manager already locked the owner's row; lock the new owner's too before checking it.
  perform 1 from public.memberships where user_id = new_owner and organization_id = me.organization_id for update;
  if not exists (
    select 1 from public.memberships
    where user_id = new_owner and organization_id = me.organization_id and role = 'admin' and deactivated_at is null
  ) then
    raise exception 'the new owner must be an active admin' using errcode = 'P0001', hint = 'not_admin';
  end if;
  if not exists (select 1 from public.memberships where user_id = me.user_id and role = 'owner') then
    raise exception 'only the owner can transfer ownership' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  update public.memberships set role = 'admin' where user_id = me.user_id;
  update public.memberships set role = 'owner'
  where user_id = new_owner and organization_id = me.organization_id and role = 'admin' and deactivated_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Existing functions: deactivated members are left out
-- ---------------------------------------------------------------------------

-- An old invite link never undoes a removal.
create or replace function public.accept_invite(invite_token text, member_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  inv public.invites%rowtype;
  existing public.memberships;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into inv from public.invites where token = invite_token;
  if not found or inv.expires_at < now() then
    raise exception 'invite not found or expired' using errcode = 'P0001', hint = 'invalid_invite';
  end if;

  select * into existing from public.memberships where user_id = uid;
  if found then
    if existing.organization_id <> inv.organization_id then
      raise exception 'already a member of a company' using errcode = 'P0001', hint = 'already_member';
    end if;
    if existing.deactivated_at is not null then
      raise exception 'access to this company was turned off' using errcode = 'P0001', hint = 'deactivated';
    end if;
    return inv.organization_id;
  end if;

  insert into public.memberships (user_id, organization_id, team_id, role, display_name)
  values (uid, inv.organization_id, inv.team_id, inv.role, btrim(member_display_name));

  return inv.organization_id;
end;
$$;

create or replace function public.set_play_days(days smallint[]) returns smallint[]
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  org uuid;
  cleaned smallint[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select organization_id into org from public.memberships
  where user_id = uid and role = 'owner' and deactivated_at is null;
  if org is null then
    raise exception 'only the owner can change play days' using errcode = 'P0001', hint = 'not_owner';
  end if;

  select coalesce(array_agg(distinct d order by d), '{}') into cleaned
  from unnest(days) as d where d between 1 and 7;
  if cardinality(cleaned) = 0 then
    raise exception 'pick at least one day' using errcode = 'P0001', hint = 'no_days';
  end if;

  update public.organizations set play_days = cleaned where id = org;
  return cleaned;
end;
$$;

create or replace function public.weekly_league(week_start date)
returns table (user_id uuid, display_name text, team_id uuid, team_name text, points integer, rounds integer)
language sql stable security definer set search_path = '' as $$
  with me as (
    select organization_id from public.memberships
    where user_id = (select auth.uid()) and deactivated_at is null
  )
  select
    m.user_id,
    m.display_name,
    m.team_id,
    t.name,
    coalesce(sum(r.points), 0)::integer,
    count(r.id)::integer
  from public.memberships m
  join me on me.organization_id = m.organization_id
  left join public.teams t on t.id = m.team_id
  left join public.rounds r
    on r.user_id = m.user_id
   and r.organization_id = m.organization_id
   and not r.is_practice
   and r.completed_at is not null
   and r.round_date between week_start and week_start + 6
  where extract(isodow from week_start) = 1
    and m.deactivated_at is null
  group by m.user_id, m.display_name, m.team_id, t.name;
$$;

-- Adds left_on, so the return type changes: drop and recreate.
drop function public.training_report(date, date);
create function public.training_report(p_from date, p_to date)
returns table (
  user_id uuid,
  display_name text,
  email text,
  team_name text,
  role text,
  joined_on date,
  left_on date,
  round_dates date[],
  cards integer,
  correct integer,
  points integer
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  org uuid;
  zone text;
begin
  select m.organization_id, o.time_zone into org, zone
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and m.deactivated_at is null;
  if org is null then
    raise exception 'only owners and admins can see the training record' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'invalid period' using errcode = 'P0001', hint = 'invalid_period';
  end if;

  return query
  with done as (
    select r.id, r.user_id, r.round_date, coalesce(r.points, 0) as points
    from public.rounds r
    where r.organization_id = org
      and not r.is_practice
      and r.completed_at is not null
      and r.round_date between p_from and p_to
  ),
  answers as (
    select d.user_id, count(*)::integer as cards, count(*) filter (where a.is_correct)::integer as correct
    from done d
    join public.round_answers a on a.round_id = d.id
    where a.answered_at is not null
    group by d.user_id
  )
  select
    m.user_id,
    m.display_name,
    u.email::text,
    t.name,
    m.role,
    (m.created_at at time zone zone)::date,
    (m.deactivated_at at time zone zone)::date,
    coalesce((select array_agg(distinct d.round_date order by d.round_date) from done d where d.user_id = m.user_id), '{}'),
    coalesce(a.cards, 0),
    coalesce(a.correct, 0),
    coalesce((select sum(d.points) from done d where d.user_id = m.user_id), 0)::integer
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.teams t on t.id = m.team_id
  left join answers a on a.user_id = m.user_id
  where m.organization_id = org
    -- Former members stay on records for periods they were part of.
    and (m.deactivated_at is null or (m.deactivated_at at time zone zone)::date >= p_from)
  order by m.display_name;
end;
$$;

create or replace function public.training_topics(p_from date, p_to date)
returns table (scam_type text, attempts integer, misses integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  org uuid;
begin
  select m.organization_id into org
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and m.deactivated_at is null;
  if org is null then
    raise exception 'only owners and admins can see the training record' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'invalid period' using errcode = 'P0001', hint = 'invalid_period';
  end if;

  return query
  select s.scam_type, count(*)::integer, count(*) filter (where not a.is_correct)::integer
  from public.rounds r
  join public.round_answers a on a.round_id = r.id and a.answered_at is not null
  join public.scenarios s on s.id = a.scenario_id
  where r.organization_id = org
    and not r.is_practice
    and r.completed_at is not null
    and r.round_date between p_from and p_to
  group by s.scam_type;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function private.caller_manager() from public, anon, authenticated;
revoke all on function private.managed_member(public.memberships, uuid) from public, anon, authenticated;

revoke all on function public.set_member_role(uuid, text) from public, anon;
revoke all on function public.set_member_team(uuid, uuid) from public, anon;
revoke all on function public.set_member_active(uuid, boolean) from public, anon;
revoke all on function public.transfer_ownership(uuid) from public, anon;
revoke all on function public.training_report(date, date) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.set_member_team(uuid, uuid) to authenticated;
grant execute on function public.set_member_active(uuid, boolean) to authenticated;
grant execute on function public.transfer_ownership(uuid) to authenticated;
grant execute on function public.training_report(date, date) to authenticated;
