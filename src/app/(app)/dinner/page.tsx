import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WeekNavigator } from "@/components/shared/week-navigator";
import {
  DinnerSlotList,
  type DinnerSlot,
} from "@/components/dinner/dinner-slot-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function DinnerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const monday = params.date
    ? getWeekMonday(new Date(params.date))
    : getWeekMonday();
  const weekStartStr = toDateString(monday);

  const { data: week } = await supabase
    .from("weeks")
    .select("id, generated")
    .eq("week_start", weekStartStr)
    .single();

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_emoji, avatar_url")
    .order("display_name");

  const profiles = profilesData ?? [];
  const generated = week?.generated ?? false;

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
    <div className="space-y-6">
      <PageHeader
        title="Souper"
        action={
          <Link
            href={`/meals?tab=dejeuner&date=${weekStartStr}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Lunch →
          </Link>
        }
      />
      <WeekNavigator
        currentDate={weekStartStr}
        generated={generated}
        basePath="/dinner"
      />
      <DinnerSlotList
        slots={slots}
        profiles={profiles}
        currentUserId={user.id}
      />
    </div>
  );
}
