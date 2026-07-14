-- Register upgrade: capture the supervisor's pre-sign-in checklist and the RPE
-- worn, as on-site evidence for HSE inspection. Both are additive and nullable,
-- so this migration is safe to run ahead of the code deploy and doesn't affect
-- existing rows or the append-only guards (they only insert, never update, here).

alter table site_register_entry add column if not exists checklist jsonb;
alter table site_register_entry add column if not exists rpe text;
