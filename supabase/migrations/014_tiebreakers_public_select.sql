-- Allow authenticated users to read all tiebreaker rows (values remain encrypted at app layer)

drop policy if exists "Users can view own tiebreakers" on public.tiebreakers;

create policy "Tiebreakers viewable by authenticated"
  on public.tiebreakers for select to authenticated
  using (true);
