-- AsTrack — richer enclosures + project RAMS file.
-- Enclosures (work areas) gain a task/activity and a set of special
-- requirements (isolations, work at height / MEWP, site inductions), each with
-- an optional detail, stored as jsonb. Projects gain an uploaded RAMS file path
-- and an AI-extracted summary, alongside the existing rams_document_url link.
-- All additive and nullable — safe to run ahead of the code deploy.

alter table work_area add column if not exists task_activity       text;
alter table work_area add column if not exists special_requirements jsonb;

alter table project add column if not exists rams_file_path text;
alter table project add column if not exists rams_summary   text;
