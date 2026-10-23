-- Scam Shield core schema: companies, teams, members, invites, scenarios, rounds.
--
-- Access model
--   * Clients (anon / authenticated) only ever READ through RLS.
--   * Company creation and invite acceptance go through the security-definer
--     functions at the bottom, so each runs as one transaction with its own checks.
--   * Rounds and answers are written only by server code using the service role:
--     the server checks answers and computes points, so players must not be able
--     to write them directly.
--   * Scenarios have no client policies at all. A readable scenarios table would
--     let anyone look up verdicts before answering.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  industry text not null default 'general'
    check (industry in ('general', 'auto_dealer', 'tax_cpa', 'mortgage_title', 'insurance')),
  -- IANA zone used to decide which calendar day a round counts for.
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  -- Lets memberships and invites reference (team, organization) together.
  unique (id, organization_id)
);

-- One company per person for now; the key can widen to (user_id, organization_id) later.
create table public.memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid,
  role text not null check (role in ('owner', 'admin', 'player')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  foreign key (team_id, organization_id) references public.teams (id, organization_id) on delete set null (team_id)
);
create index memberships_organization_idx on public.memberships (organization_id);

create table public.invites (
  token text primary key
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_id uuid,
  role text not null default 'player' check (role in ('admin', 'player')),
  expires_at timestamptz not null default now() + interval '14 days',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (team_id, organization_id) references public.teams (id, organization_id) on delete cascade
);
create index invites_organization_idx on public.invites (organization_id);

create table public.scenarios (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  locale text not null check (locale in ('en-US')),
  channel text not null
    check (channel in ('email', 'sms', 'voicemail', 'chat', 'payment_request', 'calendar_invite')),
  industry text not null
    check (industry in ('general', 'auto_dealer', 'tax_cpa', 'mortgage_title', 'insurance')),
  scam_type text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  verdict text not null check (verdict in ('legit', 'scam')),
  sender_name text not null,
  sender_address text not null,
  subject text,
  body text not null,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  red_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(red_flags) = 'array'),
  legit_reason text,
  tip text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((verdict = 'scam') = (scam_type <> 'none'))
);
create index scenarios_locale_status_idx on public.scenarios (locale, status);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Calendar day in the company's time zone; one non-practice round per player per day.
  round_date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  is_practice boolean not null default false,
  card_count smallint not null check (card_count between 1 and 20),
  score smallint check (score >= 0),
  points integer check (points >= 0),
  best_streak smallint check (best_streak >= 0)
);
create unique index rounds_one_record_per_day on public.rounds (user_id, round_date) where not is_practice;
create index rounds_user_idx on public.rounds (user_id, started_at desc);
create index rounds_organization_idx on public.rounds (organization_id, round_date);

-- Created with the round (the planned cards), filled in as the player answers.
create table public.round_answers (
  round_id uuid not null references public.rounds (id) on delete cascade,
  position smallint not null check (position >= 0),
  scenario_id text not null references public.scenarios (id),
  answer text check (answer in ('legit', 'scam')),
  is_correct boolean,
  streak smallint check (streak >= 0),
  points smallint check (points >= 0),
  answered_at timestamptz,
  primary key (round_id, position),
  check ((answer is null) = (answered_at is null))
);
create index round_answers_scenario_idx on public.round_answers (scenario_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer so policies don't recurse through memberships)
-- ---------------------------------------------------------------------------

create function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.organization_id = org
  );
$$;

create function private.has_role(org uuid, roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid()) and m.organization_id = org and m.role = any (roles)
  );
$$;

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(uuid), private.has_role(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.scenarios enable row level security;
alter table public.rounds enable row level security;
alter table public.round_answers enable row level security;

-- Nothing here is for signed-out visitors.
revoke all on public.organizations, public.teams, public.memberships, public.invites,
  public.scenarios, public.rounds, public.round_answers from anon;
-- Scenarios are server-only (see the note at the top).
revoke all on public.scenarios from authenticated;

create policy "members read their organization" on public.organizations
  for select to authenticated using ((select private.is_member(id)));
create policy "owners and admins rename their organization" on public.organizations
  for update to authenticated
  using ((select private.has_role(id, array['owner', 'admin'])))
  with check ((select private.has_role(id, array['owner', 'admin'])));

create policy "members read teams" on public.teams
  for select to authenticated using ((select private.is_member(organization_id)));
create policy "owners and admins add teams" on public.teams
  for insert to authenticated with check ((select private.has_role(organization_id, array['owner', 'admin'])));
create policy "owners and admins rename teams" on public.teams
  for update to authenticated
  using ((select private.has_role(organization_id, array['owner', 'admin'])))
  with check ((select private.has_role(organization_id, array['owner', 'admin'])));
create policy "owners and admins remove teams" on public.teams
  for delete to authenticated using ((select private.has_role(organization_id, array['owner', 'admin'])));

create policy "members read memberships" on public.memberships
  for select to authenticated using ((select private.is_member(organization_id)));

create policy "owners and admins read invites" on public.invites
  for select to authenticated using ((select private.has_role(organization_id, array['owner', 'admin'])));
create policy "owners and admins create invites" on public.invites
  for insert to authenticated
  with check (
    (select private.has_role(organization_id, array['owner', 'admin']))
    and created_by = (select auth.uid())
  );
create policy "owners and admins revoke invites" on public.invites
  for delete to authenticated using ((select private.has_role(organization_id, array['owner', 'admin'])));

create policy "players read their own rounds" on public.rounds
  for select to authenticated using (user_id = (select auth.uid()));

-- Only answered cards: unanswered rows hold the planned scenario ids.
create policy "players read their own answered cards" on public.round_answers
  for select to authenticated
  using (
    answered_at is not null
    and exists (select 1 from public.rounds r where r.id = round_id and r.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Onboarding functions
-- ---------------------------------------------------------------------------

create function public.create_organization(
  org_name text,
  org_industry text,
  team_name text,
  member_display_name text,
  org_time_zone text default 'UTC'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  org_id uuid;
  new_team_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.memberships where user_id = uid) then
    raise exception 'already a member of a company' using errcode = 'P0001', hint = 'already_member';
  end if;

  insert into public.organizations (name, industry, time_zone)
  values (btrim(org_name), org_industry, coalesce(nullif(btrim(org_time_zone), ''), 'UTC'))
  returning id into org_id;

  insert into public.teams (organization_id, name)
  values (org_id, btrim(team_name))
  returning id into new_team_id;

  insert into public.memberships (user_id, organization_id, team_id, role, display_name)
  values (uid, org_id, new_team_id, 'owner', btrim(member_display_name));

  return org_id;
end;
$$;

create function public.accept_invite(invite_token text, member_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  inv public.invites%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  select * into inv from public.invites where token = invite_token;
  if not found or inv.expires_at < now() then
    raise exception 'invite not found or expired' using errcode = 'P0001', hint = 'invalid_invite';
  end if;

  if exists (select 1 from public.memberships where user_id = uid) then
    if exists (select 1 from public.memberships where user_id = uid and organization_id = inv.organization_id) then
      return inv.organization_id;
    end if;
    raise exception 'already a member of a company' using errcode = 'P0001', hint = 'already_member';
  end if;

  insert into public.memberships (user_id, organization_id, team_id, role, display_name)
  values (uid, inv.organization_id, inv.team_id, inv.role, btrim(member_display_name));

  return inv.organization_id;
end;
$$;

revoke all on function public.create_organization(text, text, text, text, text) from public, anon;
revoke all on function public.accept_invite(text, text) from public, anon;
grant execute on function public.create_organization(text, text, text, text, text) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;
