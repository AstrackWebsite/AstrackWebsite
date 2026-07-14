-- AsTrack — staff certificate documents.
-- Until now staff certificates were only expiry DATES. This stores the actual
-- certificate file (photo or PDF) as compliance evidence, in the private,
-- per-tenant "attachments" bucket. Each row maps to a staff member and, where
-- known, the staff expiry column it evidences. Idempotent — safe to re-run.

create table if not exists staff_certificate (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  staff_id    uuid not null references staff(id) on delete cascade,
  cert_field  text,                 -- which staff *_expiry column it evidences, or null/'unknown'
  title       text,
  file_path   text not null,
  expiry_date date,
  issue_date  date,
  uploaded_at timestamptz not null default now()
);
create index if not exists staff_certificate_staff_idx on staff_certificate (staff_id);

drop trigger if exists stamp_company on staff_certificate;
create trigger stamp_company before insert on staff_certificate
  for each row execute function set_company_id();

alter table staff_certificate enable row level security;
drop policy if exists sc_read   on staff_certificate;
drop policy if exists sc_write  on staff_certificate;
drop policy if exists sc_delete on staff_certificate;
create policy sc_read   on staff_certificate for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy sc_write  on staff_certificate for insert to authenticated
  with check (is_management() and company_id = current_company_id());
create policy sc_delete on staff_certificate for delete to authenticated
  using (is_management() and company_id = current_company_id());

-- Reuse the private attachments bucket (created in 0015) for cert files.
insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;
