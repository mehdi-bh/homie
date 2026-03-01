import { redirect } from "next/navigation";
import { addWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WeekToggle } from "@/components/shared/week-toggle";
import { MealsTabs } from "@/components/meals/meals-tabs";
import {
  DinnerSlotList,
  type DinnerSlot,
} from "@/components/dinner/dinner-slot-list";
import {
  LunchDayList,
  type LunchSlot,
} from "@/components/lunch/lunch-day-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const isNext = params.week === "next";
  const tab = params.tab ?? "souper";
  const monday = isNext ? addWeeks(getWeekMonday(), 1) : getWeekMonday();
  const weekStartStr = toDateString(monday);

  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("week_start", weekStartStr)
    .single();

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_emoji, avatar_url")
    .order("display_name");

  const profiles = profilesData ?? [];

  if (tab === "dejeuner") {
    let slots: LunchSlot[] = [];
    if (week) {
      const { data: lunchData } = await supabase
        .from("lunch_slots")
        .select(
          "id, date, status, note, eaters, cook_id, recipe_id, ingredients_pushed, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, color, avatar_emoji, avatar_url), recipe:recipes!lunch_slots_recipe_id_fkey(id, name)"
        )
        .eq("week_id", week.id)
        .order("date");

      slots = (lunchData ?? []).map((slot) => ({
        id: slot.id,
        date: slot.date,
        status: slot.status as LunchSlot["status"],
        note: slot.note ?? null,
        eaters: (slot.eaters ?? []) as string[],
        cook_id: slot.cook_id!,
        cook: slot.cook as unknown as LunchSlot["cook"],
        recipe_id: (slot.recipe_id as string) ?? null,
        recipe_name: (slot.recipe as unknown as { name: string } | null)?.name ?? null,
        ingredients_pushed: slot.ingredients_pushed as boolean,
      }));
    }

    return (
      <div className="space-y-4">
        <PageHeader title="Repas" />
        <MealsTabs />
        <WeekToggle />
        <LunchDayList
          slots={slots}
          profiles={profiles}
          currentUserId={user.id}
        />
      </div>
    );
  }

  // Default: souper
  let slots: DinnerSlot[] = [];
  if (week) {
    const { data: dinnerData } = await supabase
      .from("dinner_slots")
      .select(
        "id, date, status, note, eaters, cook_id, recipe_id, ingredients_pushed, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, color, avatar_emoji, avatar_url), recipe:recipes!dinner_slots_recipe_id_fkey(id, name)"
      )
      .eq("week_id", week.id)
      .order("date");

    slots = (dinnerData ?? []).map((slot) => ({
      id: slot.id,
      date: slot.date,
      status: slot.status as DinnerSlot["status"],
      note: slot.note ?? null,
      eaters: (slot.eaters ?? []) as string[],
      cook_id: slot.cook_id!,
      cook: slot.cook as unknown as DinnerSlot["cook"],
      recipe_id: (slot.recipe_id as string) ?? null,
      recipe_name: (slot.recipe as unknown as { name: string } | null)?.name ?? null,
      ingredients_pushed: slot.ingredients_pushed as boolean,
    }));
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Repas" />
      <MealsTabs />
      <WeekToggle />
      <DinnerSlotList
        slots={slots}
        profiles={profiles}
        currentUserId={user.id}
      />
    </div>
  );
}
