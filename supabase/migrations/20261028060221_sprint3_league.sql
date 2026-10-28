-- Sprint 3: company play days (for streaks) and the weekly league.

-- ISO weekdays (1 = Monday … 7 = Sunday) on which a record round is expected.
-- A streak only breaks on one of these days. Default: Monday–Friday.
alter table public.organizations
  add column play_days smallint[] not null default '{1,2,3,4,5}'
  check (cardinality(play_days) between 1 and 7 and play_days <@ '{1,2,3,4,5,6,7}'::smallint[]);

-- Owner-only. Clients have no UPDATE grant on this column, so this is the only way to change it.
create function public.set_play_days(days smallint[]) returns smallint[]
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  org uuid;
  cleaned smallint[];
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select organization_id into org from public.memberships where user_id = uid and role = 'owner';
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

-- Weekly league rows for the caller's own company only: every member, with their
-- completed record-round points and round count for the 7 days from week_start.
-- Members with no rounds appear with 0, so team averages count everyone.
create function public.weekly_league(week_start date)
returns table (user_id uuid, display_name text, team_id uuid, team_name text, points integer, rounds integer)
language sql stable security definer set search_path = '' as $$
  with me as (
    select organization_id from public.memberships where user_id = (select auth.uid())
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
  group by m.user_id, m.display_name, m.team_id, t.name;
$$;

revoke all on function public.set_play_days(smallint[]) from public, anon;
revoke all on function public.weekly_league(date) from public, anon;
grant execute on function public.set_play_days(smallint[]) to authenticated;
grant execute on function public.weekly_league(date) to authenticated;
