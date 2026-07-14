-- AsTrack — Daily shift lifecycle. One shift per project per day: opened at
-- "Start shift", closed at "End shift". Company-scoped, mirrors the module RLS.
-- Written idempotently so it's safe to re-run.

create table if not exists site_shift (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  project_id  uuid not null references project(id),
  shift_date  date not null default current_date,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  unique (project_id, shift_date)
);
create index if not exists site_shift_project_idx on site_shift (project_id, shift_date);

drop trigger if exists stamp_company on site_shift;
create trigger stamp_company before insert on site_shift
  for each row execute function set_company_id();

alter table site_shift enable row level security;

drop policy if exists site_shift_read   on site_shift;
drop policy if exists site_shift_write  on site_shift;
drop policy if exists site_shift_update on site_shift;

create policy site_shift_read   on site_shift for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy site_shift_write  on site_shift for insert to authenticated
  with check (company_id = current_company_id());
create policy site_shift_update on site_shift for update to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());
