-- AsTrack — office notifications from site activity.
-- Each significant log a site supervisor records (exposure, plant check, site
-- diary, enclosure, handover, shift) writes a documented notification row that
-- the office/admin sees on their dashboard. Tenant-scoped; any company member
-- can insert (the supervisor emitting), management marks them read. Idempotent.

create table if not exists notification (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  project_id  uuid references project(id) on delete cascade,
  kind        text not null,
  message     text not null,
  actor_id    uuid references profiles(id),
  actor_name  text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notification_company_idx
  on notification (company_id, created_at desc);

drop trigger if exists stamp_company on notification;
create trigger stamp_company before insert on notification
  for each row execute function set_company_id();

alter table notification enable row level security;

drop policy if exists notif_read   on notification;
drop policy if exists notif_insert on notification;
drop policy if exists notif_update on notification;

create policy notif_read on notification for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy notif_insert on notification for insert to authenticated
  with check (company_id = current_company_id());
create policy notif_update on notification for update to authenticated
  using (is_management() and company_id = current_company_id())
  with check (is_management() and company_id = current_company_id());
