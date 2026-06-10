-- Add encrypted outcome column; allow plaintext outcome to be null during migration.
alter table public.predictions
  add column if not exists outcome_encrypted text;

alter table public.predictions
  alter column outcome drop not null;
