-- Owners can erase their company (docs/sprints/privacy.md).
-- Deleting the organization cascades to its teams, memberships, invites, rounds and answers.
-- Members keep their sign-in (auth.users) with no company, so they can join another one.

create function public.delete_organization(confirm_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.memberships := private.caller_manager();
  org_name text;
begin
  if me.role <> 'owner' then
    raise exception 'only the owner can delete the company' using errcode = 'P0001', hint = 'not_authorized';
  end if;
  select name into org_name from public.organizations where id = me.organization_id for update;
  -- Typing the exact name is the confirmation step.
  if confirm_name is null or btrim(confirm_name) <> btrim(org_name) then
    raise exception 'company name does not match' using errcode = 'P0001', hint = 'name_mismatch';
  end if;
  delete from public.organizations where id = me.organization_id;
end;
$$;

revoke all on function public.delete_organization(text) from public, anon;
grant execute on function public.delete_organization(text) to authenticated;
