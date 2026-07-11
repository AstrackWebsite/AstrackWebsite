-- ART Asbestos / AsTrack — add a contact phone to companies (platform CRM)
-- and capture it on signup.

alter table company add column if not exists contact_phone text;

-- Update the signup provisioning trigger to store the phone from metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into company (name, status, contact_name, contact_email, contact_phone)
  values (coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'New company'),
          'pending',
          new.raw_user_meta_data->>'contact_name',
          new.email,
          new.raw_user_meta_data->>'contact_phone')
  returning id into cid;

  insert into profiles (id, company_id, app_role, is_platform_admin)
  values (new.id, cid, 'admin', false);

  return new;
end $$;
