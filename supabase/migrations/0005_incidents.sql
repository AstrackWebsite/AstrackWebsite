-- AsTrack — Accident, Incident & Fault reporting
-- Company-scoped. Any team member can report; management investigates/closes.

create type incident_type as enum (
  'injury','near_miss','fibre_release','dangerous_occurrence',
  'equipment_failure','fault','other'
);
create type incident_status   as enum ('open','investigating','closed');
create type incident_severity as enum ('minor','moderate','serious');

create table incident (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references company(id),
  project_id           uuid references project(id),
  plant_id             uuid references plant(id),   -- equipment faults link to the asset
  type                 incident_type not null,
  title                text not null,
  description          text,
  occurred_at          timestamptz not null default now(),
  location             text,
  severity             incident_severity,
  riddor_reportable    boolean not null default false,  -- auto-suggested, editable
  reported_by_staff_id uuid references staff(id),
  status               incident_status not null default 'open',
  investigation_outcome text,
  created_at           timestamptz not null default now()
);

create index incident_company_idx on incident (company_id);
create index incident_plant_idx   on incident (plant_id);

-- auto-stamp tenant (function created in 0003)
create trigger stamp_company before insert on incident
  for each row execute function set_company_id();

alter table incident enable row level security;
create policy incident_read   on incident for select to authenticated
  using (company_id = current_company_id() or is_platform_admin());
create policy incident_write  on incident for insert to authenticated
  with check (company_id = current_company_id());
create policy incident_update on incident for update to authenticated
  using (company_id = current_company_id() and is_management())
  with check (company_id = current_company_id() and is_management());
