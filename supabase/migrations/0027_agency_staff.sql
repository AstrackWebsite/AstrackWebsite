-- AsTrack — agency / off-the-books staff added by supervisors.
-- Supervisors need to add ad-hoc agency workers on site (not on the books) and
-- assign them to the project so they can be signed onto the register. Flag such
-- records with is_agency, and open staff + project_staff inserts to any company
-- member (still tenant-scoped). Editing/removing stays management-only.

alter table staff add column if not exists is_agency boolean not null default false;

drop policy if exists staff_write on staff;
create policy staff_write on staff for insert to authenticated
  with check (company_id = current_company_id());

drop policy if exists project_staff_write on project_staff;
create policy project_staff_write on project_staff for insert to authenticated
  with check (company_id = current_company_id());
