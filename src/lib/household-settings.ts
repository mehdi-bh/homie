import { createClient } from "@/lib/supabase/server";

export async function getOrCreateHouseholdSettings() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("household_settings")
    .select("*")
    .limit(1)
    .single();

  if (settings) return settings;

  // Fetch all profiles to build default rotation arrays
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .order("display_name");

  const allIds = profiles?.map((p) => p.id) ?? [];

  const { data: newSettings, error } = await supabase
    .from("household_settings")
    .insert({
      dinner_rotation: allIds,
      lunch_rotation: allIds,
      grocery_rotation: allIds,
      chore_rotations: {},
      current_week_offset: { dinner: 0, lunch: 0, grocery: 0 },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create household settings: ${error.message}`);
  }

  return newSettings!;
}
