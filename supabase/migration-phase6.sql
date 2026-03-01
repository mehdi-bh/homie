-- Phase 6 & 7 Migration
-- Run in Supabase SQL Editor

-- ============================================================================
-- 1. Add recipe/eaters/push columns to lunch_slots
-- ============================================================================

ALTER TABLE lunch_slots
  ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES recipes(id),
  ADD COLUMN IF NOT EXISTS eaters uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ingredients_pushed boolean NOT NULL DEFAULT false;

-- ============================================================================
-- 2. Backfill existing lunch_slots eaters with all profile IDs
-- ============================================================================

UPDATE lunch_slots
SET eaters = (SELECT array_agg(id ORDER BY display_name) FROM profiles)
WHERE array_length(eaters, 1) IS NULL;

-- ============================================================================
-- 3. Create grocery_staples table
-- ============================================================================

CREATE TABLE IF NOT EXISTS grocery_staples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'autre',
  default_quantity numeric,
  default_unit text,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER grocery_staples_updated_at BEFORE UPDATE ON grocery_staples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. RLS on grocery_staples
-- ============================================================================

ALTER TABLE grocery_staples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON grocery_staples
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. Enable realtime on grocery_staples
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE grocery_staples;

-- Also enable realtime on recipes/recipe_ingredients (not in original schema)
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
ALTER PUBLICATION supabase_realtime ADD TABLE recipe_ingredients;
