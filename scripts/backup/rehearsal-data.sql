-- Made-up rows for the backup rehearsal on pull requests (.github/workflows/backup.yml): one of each
-- kind of record, including a sign-in account, so the dump → restore → count check covers them all.

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
        'rehearsal-owner@scam-shield.example', '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.organizations (id, name, industry, time_zone)
values ('22222222-2222-4222-8222-222222222222', 'Rehearsal Motors', 'auto_dealer', 'America/Chicago');

insert into public.teams (id, organization_id, name)
values ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'Sales');

insert into public.memberships (user_id, organization_id, team_id, role, display_name)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'owner', 'Rehearsal Owner');

insert into public.invites (organization_id, team_id, created_by)
values ('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111');

-- A body with a quote, a tab and a line break checks COPY escaping survives the round trip.
insert into public.scenarios (id, locale, channel, industry, scam_type, difficulty, verdict, sender_name, sender_address, subject, body, tip, status)
values ('rehearsal-wire-change', 'en-US', 'email', 'general', 'wire_change', 2, 'scam', 'Pat O''Neil', 'pat@payments.example',
        'Updated bank details', E'Hi,\n\tplease use our "new" account from today.', 'Call to confirm any change to bank details.', 'approved');

insert into public.rounds (id, user_id, organization_id, round_date, completed_at, card_count, score, points, best_streak)
values ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
        current_date, now(), 1, 1, 10, 1);

insert into public.round_answers (round_id, position, scenario_id, answer, is_correct, streak, points, answered_at)
values ('44444444-4444-4444-8444-444444444444', 0, 'rehearsal-wire-change', 'scam', true, 1, 10, now());

insert into public.record_exports (organization_id, user_id, format, period_from, period_to)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'pdf', current_date - 30, current_date);
