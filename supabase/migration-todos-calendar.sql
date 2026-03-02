-- Migration: Add todos table + calendar_events table (replaces car_reservations)
-- Run this in Supabase SQL Editor

-- Ensure public schema is on the search path
set search_path to public;

-- ============================================================================
-- TODOS TABLE
-- ============================================================================

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  created_by uuid not null references public.profiles(id),
  completed boolean not null default false,
  completed_at timestamptz,
  priority smallint not null default 0, -- 0=normal, 1=high
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_pending on public.todos(completed) where not completed;

create trigger todos_updated_at before update on public.todos
  for each row execute function public.update_updated_at();

alter table public.todos enable row level security;

create policy "Authenticated full access" on public.todos
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.todos;

-- ============================================================================
-- CALENDAR_EVENTS TABLE
-- ============================================================================

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  all_day boolean not null default false,
  category text not null default 'other'
    check (category in ('car', 'family', 'appointment', 'other')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_date on public.calendar_events(date);

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function public.update_updated_at();

alter table public.calendar_events enable row level security;

create policy "Authenticated full access" on public.calendar_events
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- MIGRATE car_reservations -> calendar_events
-- ============================================================================

insert into public.calendar_events (user_id, title, date, start_time, end_time, all_day, category, note, created_at, updated_at)
select
  user_id,
  case
    when is_grocery then 'Courses'
    when preset = 'all_day' then 'Voiture (journee)'
    when preset = 'morning' then 'Voiture (matin)'
    when preset = 'afternoon' then 'Voiture (apres-midi)'
    when preset = 'evening' then 'Voiture (soir)'
    else 'Voiture'
  end as title,
  date,
  start_time,
  end_time,
  (preset = 'all_day') as all_day,
  'car' as category,
  note,
  created_at,
  updated_at
from public.car_reservations;

-- Replace car_reservations in realtime publication
alter publication supabase_realtime drop table public.car_reservations;
alter publication supabase_realtime add table public.calendar_events;

-- Drop old table
drop table public.car_reservations;
