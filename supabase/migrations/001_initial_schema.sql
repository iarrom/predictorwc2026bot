-- WC 2026 Predictor — initial schema

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  telegram_id bigint unique,
  photo_url text,
  role text not null default 'guest' check (role in ('guest', 'participant', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  round_key text not null,
  round_display text not null,
  group_name text,
  match_number int,
  kickoff_at timestamptz not null,
  home_team_id uuid references public.teams (id),
  away_team_id uuid references public.teams (id),
  home_team_name text not null,
  away_team_name text not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  home_score int check (home_score is null or home_score >= 0),
  away_score int check (away_score is null or away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_round_key_idx on public.matches (round_key);
create index matches_kickoff_at_idx on public.matches (kickoff_at);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  position text check (position in ('GK', 'DF', 'MF', 'FW')),
  shirt_number int,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  round_key text not null,
  outcome text not null check (outcome in ('home', 'draw', 'away')),
  tiebreaker_value int check (tiebreaker_value is null or tiebreaker_value >= 0),
  points_awarded int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, telegram_id, photo_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'User'),
    (new.raw_user_meta_data ->> 'telegram_id')::bigint,
    new.raw_user_meta_data ->> 'photo_url',
    'guest'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_participant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('participant', 'admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.players enable row level security;
alter table public.predictions enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Teams viewable by authenticated"
  on public.teams for select to authenticated using (true);

create policy "Matches viewable by authenticated"
  on public.matches for select to authenticated using (true);

create policy "Admins can update matches"
  on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Players viewable by authenticated"
  on public.players for select to authenticated using (true);

create policy "Admins can manage players"
  on public.players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Predictions viewable by authenticated"
  on public.predictions for select to authenticated using (true);

create policy "Participants can insert predictions before kickoff"
  on public.predictions for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create policy "Participants can update own predictions before kickoff"
  on public.predictions for update to authenticated
  using (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  )
  with check (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create policy "Participants can delete own predictions before kickoff"
  on public.predictions for delete to authenticated
  using (
    auth.uid() = user_id
    and public.is_participant()
    and exists (
      select 1 from public.matches m
      where m.id = match_id and m.kickoff_at > now()
    )
  );

create or replace view public.leaderboard_base
with (security_invoker = true)
as
select
  p.id as user_id,
  p.display_name,
  count(pr.id) as predictions_count,
  coalesce(sum(pr.points_awarded), 0) as total_points
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
where p.role in ('participant', 'admin')
group by p.id, p.display_name;

grant select on public.leaderboard_base to authenticated;
