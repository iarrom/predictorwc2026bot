-- Block new predictions on third_place matches (0 points, broadcast only).

drop policy if exists "Participants can insert predictions before kickoff"
  on public.predictions;

create policy "Participants can insert predictions before kickoff"
  on public.predictions for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff_at > now()
        and m.round_key <> 'third_place'
    )
  );

drop policy if exists "Participants can update own predictions before kickoff"
  on public.predictions;

create policy "Participants can update own predictions before kickoff"
  on public.predictions for update to authenticated
  using (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff_at > now()
        and m.round_key <> 'third_place'
    )
  )
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff_at > now()
        and m.round_key <> 'third_place'
    )
  );

drop policy if exists "Participants can delete own predictions before kickoff"
  on public.predictions;

create policy "Participants can delete own predictions before kickoff"
  on public.predictions for delete to authenticated
  using (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.kickoff_at > now()
        and m.round_key <> 'third_place'
    )
  );
