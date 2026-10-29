-- Error alerts (docs/sprints/error-alerts.md): one row per kind of error, counted and throttled here.
-- Server code scrubs messages before calling, so no email, token, IP address or user id is stored.

create table private.error_events (
  fingerprint text primary key check (char_length(fingerprint) <= 64),
  environment text not null check (char_length(environment) <= 20),
  source text not null check (source in ('server', 'browser', 'health')),
  scope text not null check (char_length(scope) <= 120),
  message text not null check (char_length(message) <= 500),
  route text check (char_length(route) <= 200),
  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  last_alerted_at timestamptz,
  -- The count when the last email went out, so a reminder can say how many happened since.
  occurrences_at_alert integer not null default 0
);
create index error_events_last_seen_idx on private.error_events (last_seen);

-- Counts one occurrence and says whether to email: the first time, then at most once an hour,
-- within a daily budget per environment and source (counted with hit_rate_limit), so a flood of
-- browser reports can't use up the emails server errors need.
create function public.record_error(
  p_fingerprint text,
  p_environment text,
  p_source text,
  p_scope text,
  p_message text,
  p_route text,
  p_daily_alerts integer
) returns table (should_alert boolean, is_new boolean, occurrences integer, since_alert integer, first_seen timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  env text := left(p_environment, 20);
  ev private.error_events;
  due boolean;
  allowed boolean := false;
begin
  -- Expired rows first, skipping any another call is using, so cleanup never waits on a lock.
  delete from private.error_events e where e.fingerprint in (
    select s.fingerprint from private.error_events s where s.last_seen < now() - interval '30 days' for update skip locked
  );

  -- Anyone can send browser reports, so the number of new kinds per day is capped; the rest are
  -- counted together in one row.
  if p_source = 'browser'
    and not exists (select 1 from private.error_events e where e.fingerprint = p_fingerprint)
    and not public.hit_rate_limit('error-kinds:' || env || ':browser', 100, 86400)
  then
    p_fingerprint := 'browser-overflow:' || env;
    p_scope := 'browser.overflow';
    p_message := 'More than 100 different browser errors today; further new ones are counted here.';
    p_route := null;
  end if;

  insert into private.error_events as e (fingerprint, environment, source, scope, message, route)
  values (p_fingerprint, env, p_source, left(p_scope, 120), left(p_message, 500), left(p_route, 200))
  on conflict (fingerprint) do update
    set occurrences = e.occurrences + 1, last_seen = now(), message = excluded.message, route = coalesce(excluded.route, e.route)
  returning e.* into ev;

  due := ev.last_alerted_at is null or ev.last_alerted_at < now() - interval '1 hour';
  if due then
    allowed := public.hit_rate_limit('error-alerts:' || env || ':' || p_source, p_daily_alerts, 86400);
    if allowed then
      update private.error_events e set last_alerted_at = now(), occurrences_at_alert = ev.occurrences
      where e.fingerprint = ev.fingerprint;
    end if;
  end if;

  return query select allowed, ev.occurrences = 1, ev.occurrences, ev.occurrences - ev.occurrences_at_alert, ev.first_seen;
end;
$$;

-- When the email couldn't be sent: the next occurrence may try again instead of waiting an hour.
create function public.release_error_alert(p_fingerprint text) returns void
language sql security definer set search_path = '' as $$
  update private.error_events set last_alerted_at = null where fingerprint = p_fingerprint;
$$;

revoke all on function public.record_error(text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.record_error(text, text, text, text, text, text, integer) to service_role;
revoke all on function public.release_error_alert(text) from public, anon, authenticated;
grant execute on function public.release_error_alert(text) to service_role;
