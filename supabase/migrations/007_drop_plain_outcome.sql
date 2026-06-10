-- Remove plaintext outcome after backfill and app deploy.
alter table public.predictions
  drop column if exists outcome;

alter table public.predictions
  alter column outcome_encrypted set not null;
