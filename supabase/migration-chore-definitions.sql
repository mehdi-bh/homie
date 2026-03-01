-- Migration: chore_definitions table + chore_slots alterations
-- Run this in Supabase SQL Editor

-- ============================================================================
-- NEW TABLE: chore_definitions
-- ============================================================================

create table chore_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null default '🧹',
  frequency text[] not null default '{weekly}',
  assignment_mode text not null default 'rotation'
    check (assignment_mode in ('rotation', 'fixed', 'custom')),
  rotation uuid[] not null default '{}',
  rotation_offset smallint not null default 0,
  day_assignments jsonb not null default '{}',
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chore_definitions_updated_at before update on chore_definitions
  for each row execute function update_updated_at();

alter table chore_definitions enable row level security;

create policy "Authenticated full access" on chore_definitions
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table chore_definitions;

-- ============================================================================
-- ALTER: chore_slots
-- ============================================================================

alter table chore_slots
  add column chore_definition_id uuid references chore_definitions(id),
  add column due_date date;

-- Drop unique constraint on (week_id, chore_name) since we now use chore_definition_id
-- and one definition can produce multiple slots (multi-day frequency)
drop index if exists chore_slots_week_chore;
drop index if exists chore_slots_week_definition;
create unique index chore_slots_week_definition on chore_slots(week_id, chore_definition_id, due_date);
