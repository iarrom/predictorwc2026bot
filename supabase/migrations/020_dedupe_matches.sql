-- Deduplicate matches that were imported twice (date-based external_key + wc2026-{num}).
-- Keeps canonical row per round_key for final/third_place and per match_number otherwise.

create temporary table _match_orphans (
  orphan_id uuid primary key,
  canonical_id uuid not null
) on commit drop;

-- final / third_place: one canonical row per round_key
with ranked_rounds as (
  select
    id,
    round_key,
    row_number() over (
      partition by round_key
      order by
        case when match_number is not null then 0 else 1 end,
        case
          when external_key = 'wc2026-' || match_number::text then 0
          else 1
        end,
        updated_at desc nulls last,
        created_at desc
    ) as rn
  from public.matches
  where round_key in ('final', 'third_place')
),
canonical_rounds as (
  select id as canonical_id, round_key
  from ranked_rounds
  where rn = 1
)
insert into _match_orphans (orphan_id, canonical_id)
select m.id, c.canonical_id
from public.matches m
join canonical_rounds c on c.round_key = m.round_key
where m.id <> c.canonical_id;

-- Other duplicate match_numbers (if any)
with ranked_numbers as (
  select
    id,
    match_number,
    row_number() over (
      partition by match_number
      order by
        case when external_key = 'wc2026-' || match_number::text then 0 else 1 end,
        updated_at desc nulls last,
        created_at desc
    ) as rn
  from public.matches
  where match_number is not null
),
canonical_numbers as (
  select id as canonical_id, match_number
  from ranked_numbers
  where rn = 1
)
insert into _match_orphans (orphan_id, canonical_id)
select m.id, c.canonical_id
from public.matches m
join canonical_numbers c on c.match_number = m.match_number
where m.id <> c.canonical_id
on conflict (orphan_id) do nothing;

-- Re-point predictions (keep canonical row when user predicted on both)
update public.predictions p
set match_id = o.canonical_id
from _match_orphans o
where p.match_id = o.orphan_id
  and not exists (
    select 1
    from public.predictions existing
    where existing.user_id = p.user_id
      and existing.match_id = o.canonical_id
  );

delete from public.predictions p
using _match_orphans o
where p.match_id = o.orphan_id;

-- Re-point match_events (unique on match_id + event_key)
update public.match_events e
set match_id = o.canonical_id
from _match_orphans o
where e.match_id = o.orphan_id
  and not exists (
    select 1
    from public.match_events existing
    where existing.match_id = o.canonical_id
      and existing.event_key = e.event_key
  );

delete from public.match_events e
using _match_orphans o
where e.match_id = o.orphan_id;

-- Re-point prediction reminders
update public.prediction_reminders r
set match_id = o.canonical_id
from _match_orphans o
where r.match_id = o.orphan_id
  and not exists (
    select 1
    from public.prediction_reminders existing
    where existing.user_id = r.user_id
      and existing.match_id = o.canonical_id
  );

delete from public.prediction_reminders r
using _match_orphans o
where r.match_id = o.orphan_id;

delete from public.matches m
using _match_orphans o
where m.id = o.orphan_id;

create unique index if not exists matches_match_number_unique
  on public.matches (match_number)
  where match_number is not null;
