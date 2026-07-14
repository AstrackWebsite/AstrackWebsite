-- AsTrack — Work areas / enclosures with uploadable plans.
-- Each project can have one or more work areas (enclosures), each optionally
-- carrying a plan/drawing stored in a private "plans" storage bucket. Files are
-- pathed by company id so storage RLS isolates them per tenant, exactly like the
-- table rows. Idempotent — safe to re-run.

create table if not exists work_area (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id),
  project_id  uuid not null references project(id),
  name        text not null,
  location    text,
  notes       text,
  plan_path   text,
  created_at  timestamptz not null default now()
);
create index if not exists work_area_project_idx on work_area (project_id);

drop trigger if exists stamp_company on work_area;
create trigger stamp_company before insert on work_area
  for each row execute function set_company_id();

alter table work_area enable row level security;
drop policy if exists work_area_read  on work_area;
drop policy if exists work_area_write on work_area;
create policy work_area_read  on work_area for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy work_area_write on work_area for insert to authenticated
  with check (company_id = current_company_id());

-- Private bucket for plan files.
insert into storage.buckets (id, name, public)
  values ('plans', 'plans', false)
  on conflict (id) do nothing;

-- Storage isolation: a user may read/write objects in the "plans" bucket only
-- when the first path segment is their own company id.
drop policy if exists plans_read  on storage.objects;
drop policy if exists plans_write on storage.objects;
create policy plans_read on storage.objects for select to authenticated
  using (
    bucket_id = 'plans'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
create policy plans_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'plans'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
