-- AsTrack — let on-site supervisors attach handover documents.
-- With the review flow, the supervisor gathers the handover paperwork (clearance
-- certificate, certificate of reoccupation, waste consignment notes, etc.) and
-- submits it to the office. So attaching/removing closeout documents must be open
-- to any member of the company, not management-only. Still tenant-scoped.
-- Idempotent — safe to re-run.

drop policy if exists cd_write  on closeout_document;
drop policy if exists cd_delete on closeout_document;
create policy cd_write  on closeout_document for insert to authenticated
  with check (company_id = current_company_id());
create policy cd_delete on closeout_document for delete to authenticated
  using (company_id = current_company_id());
