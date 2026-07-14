-- AsTrack — close the signup tenant-isolation gap.
-- Previously handle_new_user() trusted a company_id sent in the new user's
-- metadata to decide which company they joined. Because the public anon key can
-- set that metadata directly, anyone who learned a company's UUID could attach
-- themselves to it. This replaces that with a server-side invite allowlist: a
-- new login may only join an existing company when the office has created a
-- matching (email → company) invite. Browser-supplied metadata is never trusted
-- for company membership again. Idempotent — safe to re-run.

create table if not exists company_invite (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  email       text not null,
  app_role    app_role not null default 'site',
  staff_id    uuid references staff(id),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists company_invite_open_email_idx
  on company_invite (lower(email)) where used_at is null;

alter table company_invite enable row level security;
drop policy if exists ci_read  on company_invite;
drop policy if exists ci_write on company_invite;
drop policy if exists ci_delete on company_invite;
-- Only the owning company's office can see or create its invites.
create policy ci_read  on company_invite for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy ci_write on company_invite for insert to authenticated
  with check (is_management() and company_id = current_company_id());
create policy ci_delete on company_invite for delete to authenticated
  using (is_management() and company_id = current_company_id());

-- Rewrite the signup trigger to consume a real invite instead of trusting
-- client metadata. Runs SECURITY DEFINER, so it reads/updates invites directly.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; inv company_invite%rowtype;
begin
  -- Office-created member: attach ONLY if a matching, unused invite exists.
  select * into inv
    from company_invite
   where lower(email) = lower(new.email) and used_at is null
   order by created_at desc
   limit 1;

  if inv.id is not null then
    insert into profiles (id, company_id, app_role, is_platform_admin, staff_id)
    values (new.id, inv.company_id, inv.app_role, false, inv.staff_id);
    update company_invite set used_at = now() where id = inv.id;
    return new;
  end if;

  -- Otherwise this is a self-signup: provision a brand-new PENDING company that
  -- the platform owner must approve. An attacker forging metadata lands here —
  -- in their own empty, isolated, unapproved company — never someone else's.
  insert into company (name, status, contact_name, contact_email, contact_phone)
  values (coalesce(nullif(new.raw_user_meta_data->>'company_name', ''), 'New company'),
          'pending',
          new.raw_user_meta_data->>'contact_name',
          new.email,
          new.raw_user_meta_data->>'contact_phone')
  returning id into cid;

  insert into profiles (id, company_id, app_role, is_platform_admin, staff_id)
  values (new.id, cid, 'admin', false, null);
  return new;
end $$;
