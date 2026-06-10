-- Tie-breaker: 3 group matchdays + one playoffs bucket

alter table public.tiebreakers drop constraint if exists tiebreakers_round_key_check;

alter table public.tiebreakers
  add constraint tiebreakers_round_key_check
  check (round_key in ('group_1', 'group_2', 'group_3', 'playoff'));

create or replace function public.tiebreaker_round_open(p_round_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select min(m.kickoff_at) > now()
      from public.matches m
      where case
        when p_round_key = 'playoff' then m.round_key not like 'group_%'
        else m.round_key = p_round_key
      end
    ),
    false
  );
$$;
