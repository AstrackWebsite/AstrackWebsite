-- AsTrack — link a login (profile) to a staff record, so a site supervisor's
-- account maps to their staff entry and "My Jobs" can show the projects they're
-- assigned to supervise. Nullable + idempotent — office accounts leave it null.

alter table profiles add column if not exists staff_id uuid references staff(id);
