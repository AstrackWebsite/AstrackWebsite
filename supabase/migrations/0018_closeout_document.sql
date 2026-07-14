-- AsTrack — handover / closeout documents.
-- Lets the office attach the ACTUAL handover paperwork to a job (4-stage
-- clearance certificate, certificate of reoccupation, waste consignment notes,
-- air reports, etc.) — not just tick that they were received. Files live in the
-- private, per-tenant "attachments" bucket. Idempotent — safe to re-run.

create table if not exists closeout_document (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  project_id  uuid not null references project(id) on delete cascade,
  doc_type    text not null default 'other',
  title       text,
  file_path   text not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists closeout_document_project_idx on closeout_document (project_id);

drop trigger if exists stamp_company on closeout_document;
create trigger stamp_company before insert on closeout_document
  for each row execute function set_company_id();

alter table closeout_document enable row level security;
drop policy if exists cd_read   on closeout_document;
drop policy if exists cd_write  on closeout_document;
drop policy if exists cd_delete on closeout_document;
create policy cd_read   on closeout_document for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy cd_write  on closeout_document for insert to authenticated
  with check (is_management() and company_id = current_company_id());
create policy cd_delete on closeout_document for delete to authenticated
  using (is_management() and company_id = current_company_id());

insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;
