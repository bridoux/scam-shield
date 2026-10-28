-- Sprint 4: data for the owner dashboard and the training record.
-- Both functions are owner/admin only and scoped to the caller's own company.
-- Emails are read from auth.users here (security definer) rather than copied into app tables.
-- Practice and unfinished rounds never count.

create function public.training_report(p_from date, p_to date)
returns table (
  user_id uuid,
  display_name text,
  email text,
  team_name text,
  role text,
  joined_on date,
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
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin');
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
    coalesce((select array_agg(distinct d.round_date order by d.round_date) from done d where d.user_id = m.user_id), '{}'),
    coalesce(a.cards, 0),
    coalesce(a.correct, 0),
    coalesce((select sum(d.points) from done d where d.user_id = m.user_id), 0)::integer
  from public.memberships m
  join auth.users u on u.id = m.user_id
  left join public.teams t on t.id = m.team_id
  left join answers a on a.user_id = m.user_id
  where m.organization_id = org
  order by m.display_name;
end;
$$;

create function public.training_topics(p_from date, p_to date)
returns table (scam_type text, attempts integer, misses integer)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  org uuid;
begin
  select m.organization_id into org
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin');
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

revoke all on function public.training_report(date, date) from public, anon;
revoke all on function public.training_topics(date, date) from public, anon;
grant execute on function public.training_report(date, date) to authenticated;
grant execute on function public.training_topics(date, date) to authenticated;
