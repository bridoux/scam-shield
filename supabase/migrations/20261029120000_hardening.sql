-- Hardening (docs/sprints/hardening.md): rate-limit counters, invite caps, record download log.

-- ---------------------------------------------------------------------------
-- Rate limits: fixed-window counters. Keys are HMAC-SHA256 hashes made by server code with a
-- secret, so no raw IP address or email is stored or recoverable. Only the service role can count.
-- ---------------------------------------------------------------------------

create table private.rate_limits (
  key text not null check (char_length(key) <= 128),
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
create index rate_limits_window_idx on private.rate_limits (window_start);

-- Counts one hit and says whether it is within the limit.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  bucket timestamptz;
  total integer;
begin
  if p_key is null or p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into private.rate_limits as r (key, window_start) values (p_key, bucket)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into total;
  -- Counters older than a day are never needed again (the longest window is an hour); the
  -- index keeps this cheap, and doing it on every call keeps the privacy policy's promise.
  delete from private.rate_limits where window_start < now() - interval '1 day';
  return total <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Invites: at most 25 joins per link, at most 10 active links per company
-- ---------------------------------------------------------------------------

alter table public.invites
  add column max_uses smallint not null default 25 check (max_uses between 1 and 100),
  add column uses smallint not null default 0 check (uses >= 0);

create function private.limit_active_invites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Serialises link creation per company so two requests can't both slip under the cap.
  perform 1 from public.organizations where id = new.organization_id for update;
  if (
    select count(*) from public.invites
    where organization_id = new.organization_id and expires_at > now() and uses < max_uses
  ) >= 10 then
    raise exception 'too many active invite links' using errcode = 'P0001', hint = 'too_many_invites';
  end if;
  return new;
end;
$$;

revoke all on function private.limit_active_invites() from public, anon, authenticated;

create trigger invites_limit_active before insert on public.invites
  for each row execute function private.limit_active_invites();

-- Same as before (member management), plus: a new member uses up one place on the link.
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

  update public.invites set uses = uses + 1 where token = invite_token and uses < max_uses;
  if not found then
    raise exception 'invite link is full' using errcode = 'P0001', hint = 'invite_full';
  end if;

  insert into public.memberships (user_id, organization_id, team_id, role, display_name)
  values (uid, inv.organization_id, inv.team_id, inv.role, btrim(member_display_name));

  return inv.organization_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Record download log: written by server code, read by owners and admins
-- ---------------------------------------------------------------------------

create table public.record_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Cleared when the account is deleted; the row then reads "Deleted account".
  user_id uuid references auth.users (id) on delete set null,
  format text not null check (format in ('pdf', 'csv')),
  period_from date not null,
  period_to date not null,
  created_at timestamptz not null default now()
);
create index record_exports_organization_idx on public.record_exports (organization_id, created_at desc);

alter table public.record_exports enable row level security;
revoke all on public.record_exports from anon;
revoke insert, update, delete on public.record_exports from authenticated;

create policy "owners and admins read downloads" on public.record_exports
  for select to authenticated using ((select private.has_role(organization_id, array['owner', 'admin'])));

-- ---------------------------------------------------------------------------
-- Supabase's default grants include TRUNCATE (which skips RLS), TRIGGER and REFERENCES.
-- The API can't issue them, but nobody needs them: remove them now and for future tables.
-- ---------------------------------------------------------------------------

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from anon, authenticated;
