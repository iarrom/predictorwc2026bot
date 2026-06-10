-- Realtime for prediction and tie-breaker UI updates

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'predictions'
  ) then
    alter publication supabase_realtime add table public.predictions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tiebreakers'
  ) then
    alter publication supabase_realtime add table public.tiebreakers;
  end if;
end $$;
