-- ART Asbestos — multi-tenant conversion
-- Adds a company (tenant) layer with strict data isolation, request/approval
-- access, and self-service signup provisioning. Converts existing single-tenant
-- data into a "demo" company. Safe to run once on the existing database.

begin;

-- Disable triggers for this session so we can backfill append-only evidence
-- tables. (Requires the postgres/owner role — true in the Supabase SQL editor.)
set session_replication_role = replica;

-- ── Company (tenant) ─────────────────────────────────────────────────────
create type company_status as enum ('pending','active','suspended');

create table company (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  status        company_status not null default 'pending',
  contact_name  text,
  contact_email text,
  created_at    timestamptz not null default now()
);

-- profiles gains tenant membership + a platform-owner flag
alter table profiles add column company_id uuid references company(id);
alter table profiles add column is_platform_admin boolean not null default false;

-- ── Add company_id to every tenant table ─────────────────────────────────
alter table staff                 add column company_id uuid references company(id);
alter table client                add column company_id uuid references company(id);
alter table project               add column company_id uuid references company(id);
alter table plant                 add column company_id uuid references company(id);
alter table project_plant         add column company_id uuid references company(id);
alter table site_register_entry   add column company_id uuid references company(id);
alter table exposure_record       add column company_id uuid references company(id);
alter table air_monitoring_result add column company_id uuid references company(id);
alter table plant_daily_check     add column company_id uuid references company(id);
alter table document              add column company_id uuid references company(id);
alter table project_closeout      add column company_id uuid references company(id);

-- ── Create the demo company and migrate all existing data into it ─────────
insert into company (name, status, contact_email)
values ('ART Asbestos', 'active', 'demo@artasbestos.co.uk');

update staff                 set company_id = (select id from company where name='ART Asbestos');
update client                set company_id = (select id from company where name='ART Asbestos');
update project               set company_id = (select id from company where name='ART Asbestos');
update plant                 set company_id = (select id from company where name='ART Asbestos');
update project_plant         set company_id = (select id from company where name='ART Asbestos');
update site_register_entry   set company_id = (select id from company where name='ART Asbestos');
update exposure_record       set company_id = (select id from company where name='ART Asbestos');
update air_monitoring_result set company_id = (select id from company where name='ART Asbestos');
update plant_daily_check     set company_id = (select id from company where name='ART Asbestos');
update document              set company_id = (select id from company where name='ART Asbestos');
update project_closeout      set company_id = (select id from company where name='ART Asbestos');

-- Existing login(s) join the demo company and become the platform owner
update profiles set company_id = (select id from company where name='ART Asbestos'),
                    is_platform_admin = true;

-- Now enforce NOT NULL
alter table staff                 alter column company_id set not null;
alter table client                alter column company_id set not null;
alter table project               alter column company_id set not null;
alter table plant                 alter column company_id set not null;
alter table project_plant         alter column company_id set not null;
alter table site_register_entry   alter column company_id set not null;
alter table exposure_record       alter column company_id set not null;
alter table air_monitoring_result alter column company_id set not null;
alter table plant_daily_check     alter column company_id set not null;
alter table document              alter column company_id set not null;
alter table project_closeout      alter column company_id set not null;

-- ── Tenant helper functions ──────────────────────────────────────────────
create or replace function current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid();
$$;

create or replace function is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$;

-- Auto-stamp company_id on insert from the caller's profile
create or replace function set_company_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is null then new.company_id := current_company_id(); end if;
  return new;
end $$;

create trigger stamp_company before insert on staff                 for each row execute function set_company_id();
create trigger stamp_company before insert on client                for each row execute function set_company_id();
create trigger stamp_company before insert on project               for each row execute function set_company_id();
create trigger stamp_company before insert on plant                 for each row execute function set_company_id();
create trigger stamp_company before insert on project_plant         for each row execute function set_company_id();
create trigger stamp_company before insert on site_register_entry   for each row execute function set_company_id();
create trigger stamp_company before insert on exposure_record       for each row execute function set_company_id();
create trigger stamp_company before insert on air_monitoring_result for each row execute function set_company_id();
create trigger stamp_company before insert on plant_daily_check     for each row execute function set_company_id();
create trigger stamp_company before insert on document              for each row execute function set_company_id();
create trigger stamp_company before insert on project_closeout      for each row execute function set_company_id();

-- ── Signup provisioning: a new auth user creates a pending company ───────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into company (name, status, contact_name, contact_email)
  values (coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'New company'),
          'pending',
          new.raw_user_meta_data->>'contact_name',
          new.email)
  returning id into cid;

  insert into profiles (id, company_id, app_role, is_platform_admin)
  values (new.id, cid, 'admin', false);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ── RLS rewrite: strict tenant isolation ─────────────────────────────────
alter table company enable row level security;

-- drop the single-tenant policies from 0002
drop policy if exists profiles_self_read on profiles;
drop policy if exists staff_read on staff;   drop policy if exists staff_write on staff;   drop policy if exists staff_update on staff;
drop policy if exists client_read on client; drop policy if exists client_write on client; drop policy if exists client_update on client;
drop policy if exists project_read on project; drop policy if exists project_write on project; drop policy if exists project_update on project;
drop policy if exists plant_read on plant;   drop policy if exists plant_write on plant;   drop policy if exists plant_update on plant;
drop policy if exists pp_read on project_plant; drop policy if exists pp_write on project_plant; drop policy if exists pp_delete on project_plant;
drop policy if exists sre_read on site_register_entry; drop policy if exists sre_write on site_register_entry; drop policy if exists sre_signout on site_register_entry;
drop policy if exists exp_read on exposure_record; drop policy if exists exp_write on exposure_record;
drop policy if exists pdc_read on plant_daily_check; drop policy if exists pdc_write on plant_daily_check;
drop policy if exists doc_read on document; drop policy if exists doc_write on document;
drop policy if exists air_read on air_monitoring_result; drop policy if exists air_write on air_monitoring_result;
drop policy if exists close_read on project_closeout; drop policy if exists close_write on project_closeout; drop policy if exists close_update on project_closeout;

-- company: members read own; platform admin reads/updates all
create policy company_read   on company for select to authenticated using (id = current_company_id() or is_platform_admin());
create policy company_admin  on company for update to authenticated using (is_platform_admin()) with check (is_platform_admin());

-- profiles: read self / same-company management / platform admin
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or is_platform_admin() or (company_id = current_company_id() and is_management()));

-- reusable helper predicate expressed inline per table:
--   read  : company_id = current_company_id() or is_platform_admin()
--   write : is_management() and company_id = current_company_id()

-- staff
create policy staff_read   on staff for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy staff_write  on staff for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy staff_update on staff for update to authenticated using (company_id = current_company_id() and is_management()) with check (company_id = current_company_id() and is_management());

-- client
create policy client_read   on client for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy client_write  on client for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy client_update on client for update to authenticated using (company_id = current_company_id() and is_management()) with check (company_id = current_company_id() and is_management());

-- project
create policy project_read   on project for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy project_write  on project for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy project_update on project for update to authenticated using (company_id = current_company_id() and is_management()) with check (company_id = current_company_id() and is_management());

-- plant
create policy plant_read   on plant for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy plant_write  on plant for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy plant_update on plant for update to authenticated using (company_id = current_company_id() and is_management()) with check (company_id = current_company_id() and is_management());

-- project_plant
create policy pp_read   on project_plant for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy pp_write  on project_plant for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy pp_delete on project_plant for delete to authenticated using (company_id = current_company_id() and is_management());

-- capture evidence: read within company; insert within company (any member)
create policy sre_read    on site_register_entry for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy sre_write   on site_register_entry for insert to authenticated with check (company_id = current_company_id());
create policy sre_signout on site_register_entry for update to authenticated using (company_id = current_company_id()) with check (company_id = current_company_id());

create policy exp_read  on exposure_record for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy exp_write on exposure_record for insert to authenticated with check (company_id = current_company_id());

create policy pdc_read  on plant_daily_check for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy pdc_write on plant_daily_check for insert to authenticated with check (company_id = current_company_id());

create policy doc_read  on document for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy doc_write on document for insert to authenticated with check (company_id = current_company_id());

-- approval rows: management within company
create policy air_read  on air_monitoring_result for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy air_write on air_monitoring_result for insert to authenticated with check (is_management() and company_id = current_company_id());

create policy close_read   on project_closeout for select to authenticated using (company_id = current_company_id() or is_platform_admin());
create policy close_write  on project_closeout for insert to authenticated with check (is_management() and company_id = current_company_id());
create policy close_update on project_closeout for update to authenticated using (company_id = current_company_id() and is_management()) with check (company_id = current_company_id() and is_management());

set session_replication_role = default;

commit;
