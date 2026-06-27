alter table public.matches
  add column winner text check (winner in ('home', 'away', 'draw')),
  add column home_penalties int check (home_penalties is null or home_penalties >= 0),
  add column away_penalties int check (away_penalties is null or away_penalties >= 0);
