-- AsTrack — saved report copies.
-- When the office approves a handover it generates two PDFs and files both
-- against the project: the full internal copy (audience 'office') and the
-- client-facing copy built from the sections the office chose to share
-- (audience 'client'). Files live in the private, per-tenant "attachments"
-- bucket; this table records what was generated, for whom, and which sections
-- it contained. Idempotent — safe to re-run.

create table if not exists project_report (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references company(id),
  project_id   uuid not null references project(id) on delete cascade,
  audience     text not null check (audience in ('office','client')),
  sections     text[] not null default '{}',
  title        text,
  file_path    text not null,
  generated_by uuid references profiles(id),
  generated_at timestamptz not null default now()
);
create index if not exists project_report_project_idx on project_report (project_id);

drop trigger if exists stamp_company on project_report;
create trigger stamp_company before insert on project_report
  for each row execute function set_company_id();

alter table project_report enable row level security;

drop policy if exists pr_read   on project_report;
drop policy if exists pr_write  on project_report;
drop policy if exists pr_delete on project_report;

-- Generated reports are internal: readable/writable by office/management within
-- the tenant. (Site supervisors don't manage the send-to-client step.)
create policy pr_read on project_report for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy pr_write on project_report for insert to authenticated
  with check (is_management() and company_id = current_company_id());
create policy pr_delete on project_report for delete to authenticated
  using (is_management() and company_id = current_company_id());
