-- Tie-breaker predictions: total goals per tournament round (encrypted at app layer)

create table public.tiebreakers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  round_key text not null check (
    round_key in (
      'group_stage',
      'round_of_32',
      'round_of_16',
      'quarter_final',
      'semi_final',
      'third_place',
      'final'
    )
  ),
  goals_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, round_key)
);

create index tiebreakers_user_id_idx on public.tiebreakers (user_id);

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
        when p_round_key = 'group_stage' then m.round_key like 'group_%'
        else m.round_key = p_round_key
      end
    ),
    false
  );
$$;

alter table public.tiebreakers enable row level security;

create policy "Users can view own tiebreakers"
  on public.tiebreakers for select to authenticated
  using (auth.uid() = user_id);

create policy "Participants can insert tiebreakers before round starts"
  on public.tiebreakers for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and public.tiebreaker_round_open(round_key)
  );

create policy "Participants can update own tiebreakers before round starts"
  on public.tiebreakers for update to authenticated
  using (
    auth.uid() = user_id
    and public.is_participant()
    and public.tiebreaker_round_open(round_key)
  )
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and public.tiebreaker_round_open(round_key)
  );
