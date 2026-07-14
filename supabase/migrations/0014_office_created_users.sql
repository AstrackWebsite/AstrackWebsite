-- AsTrack — let the office create additional logins (e.g. site supervisors) that
-- join the EXISTING company, instead of every signup spinning up a new company.
-- When the new auth user carries a company_id in its metadata, we attach them to
-- that company with the given role; otherwise the original self-signup path runs.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  -- Office-created member joining an existing company.
  if coalesce(new.raw_user_meta_data->>'company_id', '') <> '' then
    insert into profiles (id, company_id, app_role, is_platform_admin, staff_id)
    values (
      new.id,
      (new.raw_user_meta_data->>'company_id')::uuid,
      coalesce(nullif(new.raw_user_meta_data->>'app_role', ''), 'site')::app_role,
      false,
      nullif(new.raw_user_meta_data->>'staff_id', '')::uuid
    );
    return new;
  end if;

  -- Self-signup: provision a brand-new company (pending platform approval).
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
