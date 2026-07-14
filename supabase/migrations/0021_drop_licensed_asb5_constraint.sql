-- Drop the DB-level rule that forced licensed projects to carry an ASB5
-- notification date. The ASB5 (licensed) / ASBNNLW1 (NNLW) notification date
-- is now optional and recorded when available — it must never block creating
-- or editing a project. Validation, where wanted, lives in the app layer.

alter table project
  drop constraint if exists licensed_needs_asb5;
