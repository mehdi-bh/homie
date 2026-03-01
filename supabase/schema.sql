-- Homie Database Schema
-- Run this in Supabase SQL Editor after creating 3 auth users manually.
-- Replace the placeholder UUIDs in the seed data section with real auth.users IDs.

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null default '#4f46e5',
  avatar_emoji text not null default '🏠',
  default_lunch text,
  notify_daily boolean not null default true,
  notify_deadline boolean not null default true,
  notify_grocery boolean not null default true,
  notify_chores boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

-- household_settings
create table household_settings (
  id uuid primary key default gen_random_uuid(),
  week_start_day smallint not null default 1,
  recipe_deadline_day smallint not null default 4,
  recipe_deadline_hour smallint not null default 20,
  dinner_rotation uuid[] not null default '{}',
  lunch_rotation uuid[] not null default '{}',
  grocery_rotation uuid[] not null default '{}',
  chore_rotations jsonb not null default '{}',
  current_week_offset jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger household_settings_updated_at before update on household_settings
  for each row execute function update_updated_at();

-- weeks
create table weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_number smallint not null,
  year smallint not null,
  generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger weeks_updated_at before update on weeks
  for each row execute function update_updated_at();

-- recipes
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  tags text[] not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_name_search on recipes using gin(to_tsvector('french', name));

create trigger recipes_updated_at before update on recipes
  for each row execute function update_updated_at();

-- recipe_ingredients
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  quantity numeric not null,
  unit text not null,
  scaling_type text not null default 'per_person' check (scaling_type in ('per_person', 'fixed')),
  category text not null default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_id on recipe_ingredients(recipe_id);

create trigger recipe_ingredients_updated_at before update on recipe_ingredients
  for each row execute function update_updated_at();

-- dinner_slots
create table dinner_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  date date not null,
  cook_id uuid references profiles(id),
  recipe_id uuid references recipes(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'skipped')),
  eaters uuid[] not null default '{}',
  note text,
  ingredients_pushed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index dinner_slots_date_cook on dinner_slots(date, cook_id);
create index dinner_slots_week_id on dinner_slots(week_id);

create trigger dinner_slots_updated_at before update on dinner_slots
  for each row execute function update_updated_at();

-- lunch_slots
create table lunch_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  date date not null unique,
  cook_id uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'skipped')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lunch_slots_week_id on lunch_slots(week_id);

create trigger lunch_slots_updated_at before update on lunch_slots
  for each row execute function update_updated_at();

-- lunch_preferences
create table lunch_preferences (
  id uuid primary key default gen_random_uuid(),
  lunch_slot_id uuid not null references lunch_slots(id) on delete cascade,
  user_id uuid not null references profiles(id),
  preference text,
  eating boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index lunch_preferences_slot_user on lunch_preferences(lunch_slot_id, user_id);

create trigger lunch_preferences_updated_at before update on lunch_preferences
  for each row execute function update_updated_at();

-- chore_slots
create table chore_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  chore_name text not null,
  assigned_to uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index chore_slots_week_chore on chore_slots(week_id, chore_name);

create trigger chore_slots_updated_at before update on chore_slots
  for each row execute function update_updated_at();

-- grocery_slots
create table grocery_slots (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade unique,
  assigned_to uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'shopping', 'done')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger grocery_slots_updated_at before update on grocery_slots
  for each row execute function update_updated_at();

-- grocery_items
create table grocery_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric,
  unit text,
  category text not null default 'other',
  priority text not null default 'weekly' check (priority in ('urgent', 'weekly')),
  added_by uuid references profiles(id),
  source_recipe_id uuid references recipes(id),
  source_label text,
  checked boolean not null default false,
  checked_by uuid references profiles(id),
  checked_at timestamptz,
  archived boolean not null default false,
  week_id uuid references weeks(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grocery_items_week_id on grocery_items(week_id);
create index grocery_items_archived on grocery_items(archived) where not archived;

create trigger grocery_items_updated_at before update on grocery_items
  for each row execute function update_updated_at();

-- car_reservations
create table car_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  date date not null,
  start_time time not null,
  end_time time not null,
  note text,
  preset text check (preset in ('all_day', 'morning', 'afternoon', 'evening')),
  is_grocery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint car_time_order check (end_time > start_time)
);

create index car_reservations_date on car_reservations(date);

create trigger car_reservations_updated_at before update on car_reservations
  for each row execute function update_updated_at();

-- swaps
create table swaps (
  id uuid primary key default gen_random_uuid(),
  slot_type text not null check (slot_type in ('dinner', 'lunch', 'chore')),
  slot_id uuid not null,
  proposed_by uuid not null references profiles(id),
  proposed_to uuid not null references profiles(id),
  target_slot_id uuid,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger swaps_updated_at before update on swaps
  for each row execute function update_updated_at();

-- push_subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id on push_subscriptions(user_id);

create trigger push_subscriptions_updated_at before update on push_subscriptions
  for each row execute function update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table profiles enable row level security;
alter table household_settings enable row level security;
alter table weeks enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table dinner_slots enable row level security;
alter table lunch_slots enable row level security;
alter table lunch_preferences enable row level security;
alter table chore_slots enable row level security;
alter table grocery_slots enable row level security;
alter table grocery_items enable row level security;
alter table car_reservations enable row level security;
alter table swaps enable row level security;
alter table push_subscriptions enable row level security;

-- Simple policy: any authenticated user has full access
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'profiles', 'household_settings', 'weeks', 'recipes', 'recipe_ingredients',
      'dinner_slots', 'lunch_slots', 'lunch_preferences', 'chore_slots',
      'grocery_slots', 'grocery_items', 'car_reservations', 'swaps', 'push_subscriptions'
    ])
  loop
    execute format(
      'create policy "Authenticated full access" on %I for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end;
$$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

create or replace function merge_grocery_item(
  p_name text,
  p_quantity numeric,
  p_unit text,
  p_category text,
  p_added_by uuid,
  p_source_recipe_id uuid,
  p_source_label text,
  p_week_id uuid
) returns uuid as $$
declare
  existing_id uuid;
  result_id uuid;
begin
  -- Look for existing unchecked, unarchived item with same name + unit + week from a recipe
  select id into existing_id
  from grocery_items
  where name = p_name
    and unit = p_unit
    and week_id = p_week_id
    and not checked
    and not archived
    and source_recipe_id is not null
  limit 1;

  if existing_id is not null then
    -- Merge: add quantity and concat source label
    update grocery_items
    set quantity = coalesce(quantity, 0) + coalesce(p_quantity, 0),
        source_label = case
          when source_label is not null and p_source_label is not null
          then source_label || ', ' || p_source_label
          else coalesce(p_source_label, source_label)
        end,
        source_recipe_id = null -- Set to null since it now represents multiple recipes
    where id = existing_id;
    result_id := existing_id;
  else
    -- Insert new item
    insert into grocery_items (name, quantity, unit, category, added_by, source_recipe_id, source_label, week_id)
    values (p_name, p_quantity, p_unit, p_category, p_added_by, p_source_recipe_id, p_source_label, p_week_id)
    returning id into result_id;
  end if;

  return result_id;
end;
$$ language plpgsql;

-- ============================================================================
-- REALTIME
-- ============================================================================

alter publication supabase_realtime add table grocery_items;
alter publication supabase_realtime add table dinner_slots;
alter publication supabase_realtime add table lunch_slots;
alter publication supabase_realtime add table lunch_preferences;
alter publication supabase_realtime add table chore_slots;
alter publication supabase_realtime add table car_reservations;
alter publication supabase_realtime add table swaps;

-- ============================================================================
-- SEED DATA
-- ============================================================================
-- Replace these UUIDs with actual auth.users IDs after creating users in Supabase Dashboard.
-- Create 3 users in Dashboard > Auth > Users first, then copy their UUIDs here.

-- INSERT INTO profiles (id, display_name, color, avatar_emoji, default_lunch) VALUES
--   ('REPLACE-UUID-1', 'Mehdi', '#4f46e5', '👨‍💻', 'Riz + poulet'),
--   ('REPLACE-UUID-2', 'Romane', '#ec4899', '👩‍🎨', 'Salade + oeufs'),
--   ('REPLACE-UUID-3', 'Eliot', '#10b981', '🧑‍🎤', 'Pates + sauce tomate');

-- INSERT INTO household_settings (
--   dinner_rotation, lunch_rotation, grocery_rotation,
--   chore_rotations, current_week_offset
-- ) VALUES (
--   ARRAY['REPLACE-UUID-1'::uuid, 'REPLACE-UUID-2'::uuid, 'REPLACE-UUID-3'::uuid],
--   ARRAY['REPLACE-UUID-1'::uuid, 'REPLACE-UUID-2'::uuid, 'REPLACE-UUID-3'::uuid],
--   ARRAY['REPLACE-UUID-1'::uuid, 'REPLACE-UUID-2'::uuid, 'REPLACE-UUID-3'::uuid],
--   '{"aspirateur": ["REPLACE-UUID-1", "REPLACE-UUID-2", "REPLACE-UUID-3"], "cuisine": ["REPLACE-UUID-2", "REPLACE-UUID-3", "REPLACE-UUID-1"], "salle_de_bain": ["REPLACE-UUID-3", "REPLACE-UUID-1", "REPLACE-UUID-2"], "poubelles": ["REPLACE-UUID-1", "REPLACE-UUID-3", "REPLACE-UUID-2"]}'::jsonb,
--   '{"dinner": 0, "lunch": 0, "grocery": 0, "aspirateur": 0, "cuisine": 0, "salle_de_bain": 0, "poubelles": 0}'::jsonb
-- );
