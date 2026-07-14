-- AsTrack — enclosure set-up checks + smoke/integrity test handover.
-- Modelled on the ART Weekly Site Diary "Smoke and Integrity Test / Site
-- Clearance" section: a 10-point set-up checklist and the smoke-test handover
-- (date, times, witness, analyst handover, 4-stage clearance complete), stored
-- as jsonb on the enclosure. Additive and nullable — safe to run ahead of the
-- code deploy.

alter table work_area add column if not exists setup_checks jsonb;
alter table work_area add column if not exists smoke_test   jsonb;
