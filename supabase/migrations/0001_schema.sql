-- ART Asbestos — Phase A schema
-- Single-company, online-only. Compliance evidence is append-only (Reg 19).

-- ── Enums ────────────────────────────────────────────────────────────────
create type staff_role             as enum ('contracts_manager','site_manager','site_supervisor','operative');
create type app_role               as enum ('admin','management','site');
create type project_classification as enum ('licensed','nnlw','general');
create type project_status         as enum ('pending','setup','live','completed');
create type plant_type             as enum ('vacuum','dcu','npu','smoke_machine','lead_110v','transformer','other');
create type air_monitoring_type    as enum ('background','leak','reassurance','clearance');
create type asbestos_type          as enum ('chrysotile','amosite','crocidolite');
create type document_kind          as enum ('rams','asb5','waste_note','air_cert','permit','isolation','photo','closeout_pack','other');

-- ── Foundation tables ────────────────────────────────────────────────────
create table staff (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  role                     staff_role not null,
  contact                  text,
  email                    text,
  asbestos_training_expiry date,
  medical_expiry           date,
  face_fit_expiry          date,
  mask_service_expiry      date,
  smsts_expiry             date,
  sssts_expiry             date,
  cm_training_expiry       date,
  years_in_trade           int,
  archived                 boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  staff_id   uuid references staff(id),
  app_role   app_role not null default 'site',
  created_at timestamptz not null default now()
);

create table client (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text,
  address    text,
  email      text,
  created_at timestamptz not null default now()
);

create table project (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null unique,
  address                text not null,
  classification         project_classification not null,
  status                 project_status not null default 'pending',
  start_date             date,
  end_date               date,
  max_operatives         int,
  contracts_manager_id   uuid references staff(id),
  supervisor_id          uuid references staff(id),
  client_id              uuid references client(id),
  asb5_notification_date date,
  rams_document_url      text,
  contract_value         numeric(12,2),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint licensed_needs_asb5
    check (classification <> 'licensed' or asb5_notification_date is not null)
);

create table plant (
  id            uuid primary key default gen_random_uuid(),
  asset_id      text not null unique,
  type          plant_type not null,
  name          text,
  cert_number   text,
  cert_expiry   date,
  test_reading  numeric,       -- NPU flow rate (m³/h)
  latest_service date,
  retest_date   date,
  dop_test_date date,          -- DCU DOP/CIAS test
  created_at    timestamptz not null default now()
);

create table project_plant (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references project(id) on delete cascade,
  plant_id    uuid not null references plant(id),
  assigned_at timestamptz not null default now(),
  unique (project_id, plant_id)
);

-- ── Site-operations evidence (append-only) ───────────────────────────────
create table site_register_entry (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references project(id),
  staff_id     uuid not null references staff(id),
  entry_date   date not null default current_date,
  check_in     timestamptz,
  check_out    timestamptz,
  blocked      boolean not null default false,
  block_reason text,
  created_at   timestamptz not null default now()
);

create table exposure_record (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references project(id),
  staff_id      uuid not null references staff(id),
  entry_date    date not null default current_date,
  task          text,
  asbestos_type asbestos_type,
  shift1_start  time, shift1_end time,
  shift2_start  time, shift2_end time,
  mask_worn     text,
  mask_service_expiry_at_time date,
  hours_exposure numeric(5,2) not null,
  fibre_level    numeric(6,3) not null,
  twa_4h numeric(6,3) generated always as (fibre_level * hours_exposure / 4.0) stored,
  created_at    timestamptz not null default now()
);

create table air_monitoring_result (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references project(id),
  type             air_monitoring_type not null,
  result_fml       numeric(6,3),
  pass             boolean,
  analyst_cert_url text,
  supervisor_id    uuid references staff(id),
  sampled_on       date,
  created_at       timestamptz not null default now()
);

create table plant_daily_check (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references project(id),
  plant_id            uuid not null references plant(id),
  check_date          date not null default current_date,
  passed              boolean not null,
  is_start_of_project boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (project_id, plant_id, check_date)
);

create table document (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references project(id),
  kind       document_kind not null,
  url        text not null,
  filename   text,
  created_at timestamptz not null default now()
);

create table project_closeout (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references project(id),
  plan_of_work_delivered         boolean not null default false,
  air_monitoring_complete        boolean not null default false,
  four_stage_clearance_commenced boolean not null default false,
  cert_reoccupation_received     boolean not null default false,
  site_clearance_confirmed       boolean not null default false,
  documentation_confirmed        boolean not null default false,
  client_rating   int check (client_rating between 1 and 5),
  client_comments text,
  closeout_pdf_url text,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Helper functions ─────────────────────────────────────────────────────

-- Rule 1: single authority for cert-blocking.
create or replace function staff_block_reason(s staff)
returns text language sql stable as $$
  select case
    when s.medical_expiry      < current_date then 'Medical expired'
    when s.face_fit_expiry     < current_date then 'Face fit expired'
    when s.mask_service_expiry < current_date then 'Mask service expired'
    else null end;
$$;

-- Rule 2: RLS predicates.
create or replace function current_app_role()
returns app_role language sql stable security definer set search_path = public as $$
  select app_role from profiles where id = auth.uid();
$$;

create or replace function is_management()
returns boolean language sql stable as $$
  select coalesce(current_app_role() in ('admin','management'), false);
$$;

-- ── Append-only / immutability (Rule 7) ──────────────────────────────────
create or replace function prevent_delete()
returns trigger language plpgsql as $$
begin raise exception '% rows are compliance evidence and cannot be deleted', tg_table_name; end $$;

create or replace function prevent_update()
returns trigger language plpgsql as $$
begin raise exception '% rows are immutable compliance evidence', tg_table_name; end $$;

-- Register entries may only change check_out / block fields (sign-out).
create or replace function guard_register_update()
returns trigger language plpgsql as $$
begin
  if new.project_id <> old.project_id
     or new.staff_id <> old.staff_id
     or new.entry_date <> old.entry_date
     or new.check_in is distinct from old.check_in
     or new.created_at <> old.created_at then
    raise exception 'Only check_out / block fields may be updated on a register entry';
  end if;
  return new;
end $$;

create trigger no_del before delete on exposure_record       for each row execute function prevent_delete();
create trigger no_del before delete on air_monitoring_result for each row execute function prevent_delete();
create trigger no_del before delete on plant_daily_check     for each row execute function prevent_delete();
create trigger no_del before delete on site_register_entry   for each row execute function prevent_delete();
create trigger no_del before delete on document              for each row execute function prevent_delete();

create trigger no_upd before update on exposure_record       for each row execute function prevent_update();
create trigger no_upd before update on air_monitoring_result for each row execute function prevent_update();
create trigger no_upd before update on plant_daily_check     for each row execute function prevent_update();
create trigger no_upd before update on document              for each row execute function prevent_update();
create trigger reg_upd before update on site_register_entry  for each row execute function guard_register_update();

-- keep updated_at fresh on the mutable foundation tables
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger touch_staff   before update on staff   for each row execute function touch_updated_at();
create trigger touch_project before update on project for each row execute function touch_updated_at();
