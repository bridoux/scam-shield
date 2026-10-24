-- weekly_league only answers for whole weeks (week_start must be a Monday), so colleagues
-- can't difference overlapping windows to reconstruct each other's daily activity.
create or replace function public.weekly_league(week_start date)
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
  where extract(isodow from week_start) = 1
  group by m.user_id, m.display_name, m.team_id, t.name;
$$;
