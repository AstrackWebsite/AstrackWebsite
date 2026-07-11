-- ART Asbestos — Row-Level Security (Rule 2)
-- Site users capture data; only management/admin edit project-level data or
-- approve records. Single-company demo: all authenticated users can read.

alter table staff                enable row level security;
alter table profiles             enable row level security;
alter table client               enable row level security;
alter table project              enable row level security;
alter table plant                enable row level security;
alter table project_plant        enable row level security;
alter table site_register_entry  enable row level security;
alter table exposure_record      enable row level security;
alter table air_monitoring_result enable row level security;
alter table plant_daily_check    enable row level security;
alter table document             enable row level security;
alter table project_closeout     enable row level security;

-- ── profiles: a user reads their own profile; management reads all ────────
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_management());

-- ── Foundation tables: read for all authed; write for management ─────────
-- staff
create policy staff_read   on staff for select to authenticated using (true);
create policy staff_write  on staff for insert to authenticated with check (is_management());
create policy staff_update on staff for update to authenticated using (is_management()) with check (is_management());

-- client
create policy client_read   on client for select to authenticated using (true);
create policy client_write  on client for insert to authenticated with check (is_management());
create policy client_update on client for update to authenticated using (is_management()) with check (is_management());

-- project
create policy project_read   on project for select to authenticated using (true);
create policy project_write  on project for insert to authenticated with check (is_management());
create policy project_update on project for update to authenticated using (is_management()) with check (is_management());

-- plant
create policy plant_read   on plant for select to authenticated using (true);
create policy plant_write  on plant for insert to authenticated with check (is_management());
create policy plant_update on plant for update to authenticated using (is_management()) with check (is_management());

-- project_plant (assignment)
create policy pp_read   on project_plant for select to authenticated using (true);
create policy pp_write  on project_plant for insert to authenticated with check (is_management());
create policy pp_delete on project_plant for delete to authenticated using (is_management());

-- ── Capture evidence: read for all; INSERT for any authed (site capture) ─
-- UPDATE/DELETE are blocked at the trigger layer regardless of policy.
create policy sre_read  on site_register_entry for select to authenticated using (true);
create policy sre_write on site_register_entry for insert to authenticated with check (true);
create policy sre_signout on site_register_entry for update to authenticated using (true) with check (true);

create policy exp_read  on exposure_record for select to authenticated using (true);
create policy exp_write on exposure_record for insert to authenticated with check (true);

create policy pdc_read  on plant_daily_check for select to authenticated using (true);
create policy pdc_write on plant_daily_check for insert to authenticated with check (true);

create policy doc_read  on document for select to authenticated using (true);
create policy doc_write on document for insert to authenticated with check (true);

-- ── Approval rows: management only ───────────────────────────────────────
create policy air_read   on air_monitoring_result for select to authenticated using (true);
create policy air_write  on air_monitoring_result for insert to authenticated with check (is_management());

create policy close_read   on project_closeout for select to authenticated using (true);
create policy close_write  on project_closeout for insert to authenticated with check (is_management());
create policy close_update on project_closeout for update to authenticated using (is_management()) with check (is_management());
