-- AsTrack — Daily site log (diary) + visitor log.
-- Company-scoped, per project. HSE expect a daily site log and a visitor record
-- on site; both are captured here as append-only evidence.

create table site_log (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references company(id),
  project_id      uuid not null references project(id),
  log_date        date not null default current_date,
  author_staff_id uuid references staff(id),
  category        text,
  note            text not null,
  created_at      timestamptz not null default now()
);
create index site_log_project_idx on site_log (project_id, log_date);

create table site_visitor (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references company(id),
  project_id   uuid not null references project(id),
  visit_date   date not null default current_date,
  name         text not null,
  organisation text,
  purpose      text,
  time_in      timestamptz,
  time_out     timestamptz,
  created_at   timestamptz not null default now()
);
create index site_visitor_project_idx on site_visitor (project_id, visit_date);

-- auto-stamp tenant (function created in 0003)
create trigger stamp_company before insert on site_log     for each row execute function set_company_id();
create trigger stamp_company before insert on site_visitor for each row execute function set_company_id();

alter table site_log     enable row level security;
alter table site_visitor enable row level security;

create policy site_log_read  on site_log for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy site_log_write on site_log for insert to authenticated
  with check (company_id = current_company_id());

create policy site_visitor_read   on site_visitor for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy site_visitor_write  on site_visitor for insert to authenticated
  with check (company_id = current_company_id());
create policy site_visitor_update on site_visitor for update to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());
