-- AsTrack — remaining ART Weekly Site Diary sections.
-- Adds: extra staff tickets; weekly RPE inspection log; HAV exposure record;
-- anemometer readings; DCU daily inspection; toolbox-talk log; and project
-- planning feedback on closeout. All additive; new tables are tenant-scoped and
-- follow the existing company-isolation pattern. Idempotent — safe to re-run.

-- 1. Extra staff tickets ------------------------------------------------------
alter table staff add column if not exists wah_expiry         date;
alter table staff add column if not exists pasma_expiry       date;
alter table staff add column if not exists ipaf_expiry        date;
alter table staff add column if not exists face_fit_ff_expiry date;

-- Helper to apply the standard tenant RLS to a new site-diary table.
-- (Written inline per table below rather than as a function for clarity.)

-- 2. Weekly RPE inspection ----------------------------------------------------
create table if not exists rpe_inspection (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references company(id),
  project_id      uuid not null references project(id) on delete cascade,
  inspection_date date not null,
  employee_name   text,
  mask_ref        text,
  make_model      text,
  passed          boolean not null default true,
  comments        text,
  inspector_name  text,
  created_at      timestamptz not null default now()
);
create index if not exists rpe_inspection_project_idx on rpe_inspection (project_id);

-- 3. HAV exposure -------------------------------------------------------------
create table if not exists hav_exposure (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references company(id),
  project_id          uuid not null references project(id) on delete cascade,
  entry_date          date not null,
  tool                text,
  start_time          text,
  finish_time         text,
  operative1          text,
  duration1           text,
  operative2          text,
  duration2           text,
  vibration_magnitude numeric,
  eav                 text,
  elv                 text,
  created_at          timestamptz not null default now()
);
create index if not exists hav_exposure_project_idx on hav_exposure (project_id);

-- 4. Anemometer readings ------------------------------------------------------
create table if not exists anemometer_reading (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references company(id),
  project_id       uuid not null references project(id) on delete cascade,
  reading_date     date not null,
  npu_id           text,
  npu_capacity     numeric,
  points           jsonb,
  filter_face_m2   numeric,
  average_velocity numeric,
  volume_m3        numeric,
  created_at       timestamptz not null default now()
);
create index if not exists anemometer_reading_project_idx on anemometer_reading (project_id);

-- 5. DCU daily inspection -----------------------------------------------------
create table if not exists dcu_inspection (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references company(id),
  project_id      uuid not null references project(id) on delete cascade,
  inspection_date date not null,
  dcu_id          text,
  checks          jsonb,
  comments        text,
  created_at      timestamptz not null default now()
);
create index if not exists dcu_inspection_project_idx on dcu_inspection (project_id);

-- 6. Toolbox talks ------------------------------------------------------------
create table if not exists toolbox_talk (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references company(id),
  project_id   uuid not null references project(id) on delete cascade,
  talk_date    date not null,
  topic        text,
  delivered_by text,
  attendees    text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists toolbox_talk_project_idx on toolbox_talk (project_id);

-- Company stamping + RLS for each new table.
do $$
declare t text;
begin
  foreach t in array array[
    'rpe_inspection','hav_exposure','anemometer_reading','dcu_inspection','toolbox_talk'
  ] loop
    execute format('drop trigger if exists stamp_company on %I;', t);
    execute format('create trigger stamp_company before insert on %I for each row execute function set_company_id();', t);
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('drop policy if exists %I_write on %I;', t, t);
    execute format('create policy %I_read on %I for select to authenticated using (company_id = current_company_id() or is_platform_admin());', t, t);
    execute format('create policy %I_write on %I for insert to authenticated with check (company_id = current_company_id());', t, t);
  end loop;
end $$;

-- 7. Project planning feedback on closeout ------------------------------------
alter table project_closeout add column if not exists fb_sufficient_time  text;
alter table project_closeout add column if not exists fb_enough_persons   text;
alter table project_closeout add column if not exists fb_enough_materials text;
alter table project_closeout add column if not exists fb_changes_made     text;
alter table project_closeout add column if not exists fb_improvements     text;
