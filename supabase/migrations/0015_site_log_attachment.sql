-- AsTrack — Site diary attachments.
-- A diary entry can carry one attachment (a site photo or a PDF) stored in a
-- private, per-tenant "attachments" bucket. The file is uploaded server-side
-- via the service-role client, so no extra storage policies are required.
-- Idempotent — safe to re-run.

alter table site_log add column if not exists attachment_path text;
alter table site_log add column if not exists attachment_type text;

-- Private bucket for site-diary (and future) attachments.
insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;
