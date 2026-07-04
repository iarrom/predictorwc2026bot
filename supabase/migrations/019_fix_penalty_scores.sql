-- football-data.org stores fullTime including penalty shootout goals;
-- subtract penalties to restore the main-time score.
update public.matches
set home_score = home_score - home_penalties,
    away_score = away_score - away_penalties,
    updated_at = now()
where status = 'finished'
  and home_penalties is not null
  and away_penalties is not null
  and home_score >= home_penalties
  and away_score >= away_penalties;
