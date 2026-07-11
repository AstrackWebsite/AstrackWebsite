-- AsTrack — internal H&S audits (scored site compliance audits)
-- Company-scoped, append-only evidence.

create table audit (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references company(id),
  project_id       uuid references project(id),
  auditor_staff_id uuid references staff(id),
  audit_date       date not null default current_date,
  score            numeric(5,2),          -- percentage, N/A excluded
  responses        jsonb not null default '[]'::jsonb,
  notes            text,
  created_at       timestamptz not null default now()
);

create index audit_company_idx on audit (company_id);
create index audit_project_idx on audit (project_id);

create trigger stamp_company before insert on audit
  for each row execute function set_company_id();

-- audits are point-in-time evidence: no update / delete
create trigger no_del before delete on audit for each row execute function prevent_delete();
create trigger no_upd before update on audit for each row execute function prevent_update();

alter table audit enable row level security;
create policy audit_read  on audit for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy audit_write on audit for insert to authenticated
  with check (company_id = current_company_id());
