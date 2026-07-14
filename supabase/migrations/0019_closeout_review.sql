-- AsTrack — supervisor submits the handover to the office for review; the office
-- does the final "Complete Project" sign-off.
--
-- The on-site supervisor fills the handover checklist and SUBMITS it. That marks
-- the closeout as awaiting office review (submitted_for_review_at) but does NOT
-- complete the job. Completion stays a management/office action. To let a site
-- supervisor write the checklist + set the submit flag, the closeout table's
-- write/update policies are opened to any member of the company (still tenant
-- scoped); the project's own status column stays management-only, so a
-- supervisor cannot mark a job completed. Idempotent — safe to re-run.

alter table project_closeout add column if not exists submitted_for_review_at timestamptz;

-- Closeout checklist: any company member may fill/submit it (was management-only).
drop policy if exists close_write  on project_closeout;
drop policy if exists close_update on project_closeout;
create policy close_write  on project_closeout for insert to authenticated
  with check (company_id = current_company_id());
create policy close_update on project_closeout for update to authenticated
  using (company_id = current_company_id())
  with check (company_id = current_company_id());
