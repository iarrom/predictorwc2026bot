-- Prediction reminder notifications: user timezone + deduplication log + pg_cron job.
-- Before running: set vault secret via Supabase Dashboard → Project Settings → Vault:
--   reminders_edge_url = https://<project-ref>.supabase.co/functions/v1/send-prediction-reminders
-- (cron_secret from 004_cron_sync.sql is reused)

alter table public.profiles
  add column if not exists timezone text;

create table public.prediction_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index prediction_reminders_match_id_idx on public.prediction_reminders (match_id);

alter table public.prediction_reminders enable row level security;

create or replace function public.invoke_send_prediction_reminders()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  edge_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into edge_url
  from vault.decrypted_secrets
  where name = 'reminders_edge_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if edge_url is null or cron_secret is null then
    raise notice 'send-prediction-reminders cron skipped: vault secrets reminders_edge_url / cron_secret not configured';
    return null;
  end if;

  select net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := '{}'::jsonb
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_send_prediction_reminders() from public;
grant execute on function public.invoke_send_prediction_reminders() to postgres;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'send-prediction-reminders'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'send-prediction-reminders',
  '*/10 * * * *',
  $$select public.invoke_send_prediction_reminders();$$
);
