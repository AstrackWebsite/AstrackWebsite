-- AsTrack — project team roster. The office assigns which staff are on a job;
-- the site supervisor can then only sign in people from that team. Company-scoped,
-- office assigns (is_management), everyone in the company can read. Idempotent.

create table if not exists project_staff (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  project_id  uuid not null references project(id),
  staff_id    uuid not null references staff(id),
  assigned_at timestamptz not null default now(),
  unique (project_id, staff_id)
);
create index if not exists project_staff_project_idx on project_staff (project_id);

drop trigger if exists stamp_company on project_staff;
create trigger stamp_company before insert on project_staff
  for each row execute function set_company_id();

alter table project_staff enable row level security;
drop policy if exists project_staff_read   on project_staff;
drop policy if exists project_staff_write   on project_staff;
drop policy if exists project_staff_delete on project_staff;
create policy project_staff_read on project_staff for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy project_staff_write on project_staff for insert to authenticated
  with check (is_management() and company_id = current_company_id());
create policy project_staff_delete on project_staff for delete to authenticated
  using (company_id = current_company_id() and is_management());
