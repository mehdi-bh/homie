import { createClient } from "@/lib/supabase/server";
import {
  getWeekMonday,
  getWeekDates,
  getWeekMeta,
  getDinnerAssignments,
  getLunchAssignments,
  getGroceryAssignment,
  toDateString,
} from "@/lib/rotation";
import { getOrCreateHouseholdSettings } from "@/lib/household-settings";
import { addDays, addWeeks } from "date-fns";

const DAY_INDEX: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

export async function generateWeek(targetDate?: Date) {
  const supabase = await createClient();

  // Default: generate for next week
  const baseDate = targetDate ?? addWeeks(new Date(), 1);
  const monday = getWeekMonday(baseDate);
  const weekMeta = getWeekMeta(monday);
  const weekStartStr = toDateString(monday);

  // Check if week already exists and is generated
  const { data: existingWeek } = await supabase
    .from("weeks")
    .select("id, generated")
    .eq("week_start", weekStartStr)
    .single();

  if (existingWeek?.generated) {
    return { weekId: existingWeek.id, alreadyGenerated: true };
  }

  // Get household settings (auto-creates if missing)
  const settings = await getOrCreateHouseholdSettings();

  // Get all profile IDs for eaters default
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .order("display_name");

  const allProfileIds = profiles?.map((p) => p.id) ?? [];

  // Create or update week row
  let weekId: string;

  if (existingWeek) {
    weekId = existingWeek.id;
  } else {
    const { data: newWeek, error: weekError } = await supabase
      .from("weeks")
      .insert({
        week_start: weekStartStr,
        week_number: weekMeta.weekNumber,
        year: weekMeta.year,
        generated: false,
      })
      .select("id")
      .single();

    if (weekError || !newWeek) {
      throw new Error(`Failed to create week: ${weekError?.message}`);
    }
    weekId = newWeek.id;
  }

  const dates = getWeekDates(monday);
  const offsets = settings.current_week_offset as Record<string, number>;

  // Generate dinner slots
  const dinnerRotation = settings.dinner_rotation as string[];
  const dinnerOffset = offsets.dinner ?? 0;
  const dinnerCooks = getDinnerAssignments(dinnerRotation, dinnerOffset);

  const dinnerSlots = dates.map((date, i) => ({
    week_id: weekId,
    date: toDateString(date),
    cook_id: dinnerCooks[i],
    status: "pending" as const,
    eaters: allProfileIds,
  }));

  // Generate lunch slots
  const lunchRotation = settings.lunch_rotation as string[];
  const lunchOffset = offsets.lunch ?? 0;
  const lunchCooks = getLunchAssignments(lunchRotation, lunchOffset);

  const lunchSlots = dates.map((date, i) => ({
    week_id: weekId,
    date: toDateString(date),
    cook_id: lunchCooks[i],
    status: "pending" as const,
    eaters: allProfileIds,
  }));

  // Generate chore slots from chore_definitions
  const { data: choreDefs } = await supabase
    .from("chore_definitions")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const choreSlots = (choreDefs ?? []).flatMap((def) => {
    const frequency = def.frequency as string[];
    const rotation = def.rotation as string[];
    const dayAssignments = (def.day_assignments ?? {}) as Record<string, string>;
    const offset = def.rotation_offset ?? 0;

    // Determine which days to generate slots for
    const isWeekly = frequency.includes("weekly");
    const days: (string | null)[] = isWeekly ? [null] : frequency;

    return days.map((day, i) => {
      let assignedTo: string | null = null;

      switch (def.assignment_mode) {
        case "rotation":
          if (rotation.length > 0) {
            assignedTo = rotation[(offset + i) % rotation.length];
          }
          break;
        case "fixed":
          assignedTo = rotation[0] ?? null;
          break;
        case "custom":
          assignedTo = day ? (dayAssignments[day] ?? null) : null;
          break;
      }

      let dueDate: string | null = null;
      if (day) {
        const dayIdx = DAY_INDEX[day];
        if (dayIdx !== undefined) {
          dueDate = toDateString(addDays(monday, dayIdx));
        }
      }

      return {
        week_id: weekId,
        chore_name: def.name,
        chore_definition_id: def.id,
        assigned_to: assignedTo,
        due_date: dueDate,
        status: "pending" as const,
      };
    });
  });

  // Generate grocery slot
  const groceryRotation = settings.grocery_rotation as string[];
  const groceryOffset = offsets.grocery ?? 0;
  const groceryAssignee = getGroceryAssignment(groceryRotation, groceryOffset);

  // Insert all slots
  const results = await Promise.all([
    supabase.from("dinner_slots").insert(dinnerSlots),
    supabase.from("lunch_slots").insert(lunchSlots),
    ...(choreSlots.length > 0
      ? [supabase.from("chore_slots").insert(choreSlots)]
      : []),
    supabase.from("grocery_slots").insert({
      week_id: weekId,
      assigned_to: groceryAssignee,
      status: "pending",
    }),
  ]);

  // Check for errors
  for (const result of results) {
    if (result.error) {
      throw new Error(`Failed to insert slots: ${result.error.message}`);
    }
  }

  // Mark week as generated and advance offsets
  const newOffsets = { ...offsets };
  newOffsets.dinner = (dinnerOffset + 1) % dinnerRotation.length;
  newOffsets.lunch = (lunchOffset + 1) % lunchRotation.length;
  newOffsets.grocery = (groceryOffset + 1) % groceryRotation.length;

  await supabase
    .from("weeks")
    .update({ generated: true })
    .eq("id", weekId);

  await supabase
    .from("household_settings")
    .update({ current_week_offset: newOffsets })
    .eq("id", settings.id);

  // Advance rotation_offset on each rotation-mode chore definition
  const rotationDefs = (choreDefs ?? []).filter(
    (def) => def.assignment_mode === "rotation" && def.rotation.length > 0
  );
  for (const def of rotationDefs) {
    const rotation = def.rotation as string[];
    const frequency = def.frequency as string[];
    const slotCount = frequency.includes("weekly") ? 1 : frequency.length;
    const newOffset = ((def.rotation_offset ?? 0) + slotCount) % rotation.length;
    await supabase
      .from("chore_definitions")
      .update({ rotation_offset: newOffset })
      .eq("id", def.id);
  }

  return { weekId, alreadyGenerated: false };
}
