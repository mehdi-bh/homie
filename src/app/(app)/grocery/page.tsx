import { redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { GroceryList, type PlannedMeal } from "@/components/grocery/grocery-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function GroceryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monday = getWeekMonday();
  const weekStartStr = toDateString(monday);
  const nextMonday = addWeeks(monday, 1);
  const nextWeekStartStr = toDateString(nextMonday);

  // Round 1: all independent queries in parallel
  const [
    { data: currentWeek },
    { data: nextWeek },
    { data: profilesData },
    { data: groceryItems },
    { data: staples },
  ] = await Promise.all([
    supabase
      .from("weeks")
      .select("id")
      .eq("week_start", weekStartStr)
      .single(),
    supabase
      .from("weeks")
      .select("id")
      .eq("week_start", nextWeekStartStr)
      .single(),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_emoji, avatar_url")
      .order("display_name"),
    supabase
      .from("grocery_items")
      .select("id, name, quantity, unit, category, priority, checked, source_label")
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("grocery_staples")
      .select("id, name, category, default_quantity, default_unit")
      .order("sort_order"),
  ]);

  const profiles = profilesData ?? [];

  const items = (groceryItems ?? []).map((i) => ({
    ...i,
    quantity: i.quantity != null ? Number(i.quantity) : null,
    priority: i.priority as "urgent" | "weekly",
  }));

  // Round 2: queries that need week IDs
  let dutyPerson: (typeof profiles)[number] | null = null;
  let meals: PlannedMeal[] = [];

  const weekIds = [currentWeek?.id, nextWeek?.id].filter(Boolean) as string[];
  const round2: Array<PromiseLike<void>> = [];

  if (currentWeek) {
    round2.push(
      supabase
        .from("grocery_slots")
        .select("assigned_to")
        .eq("week_id", currentWeek.id)
        .single()
        .then(({ data: grocerySlot }: { data: { assigned_to: string | null } | null }) => {
          if (grocerySlot?.assigned_to) {
            dutyPerson = profiles.find((p) => p.id === grocerySlot.assigned_to) ?? null;
          }
        })
    );
  }

  if (weekIds.length > 0) {
    round2.push(
      Promise.all([
        supabase
          .from("dinner_slots")
          .select(
            "date, status, eaters, cook:profiles!dinner_slots_cook_id_fkey(display_name), recipe:recipes!dinner_slots_recipe_id_fkey(name)"
          )
          .in("week_id", weekIds)
          .neq("status", "skipped")
          .order("date"),
        supabase
          .from("lunch_slots")
          .select(
            "date, status, eaters, cook:profiles!lunch_slots_cook_id_fkey(display_name), recipe:recipes!lunch_slots_recipe_id_fkey(name)"
          )
          .in("week_id", weekIds)
          .neq("status", "skipped")
          .order("date"),
      ]).then(([{ data: dinnerSlots }, { data: lunchSlots }]) => {
        for (const slot of dinnerSlots ?? []) {
          const recipeName = (slot.recipe as unknown as { name: string } | null)?.name;
          if (!recipeName) continue;
          const cookName = (slot.cook as unknown as { display_name: string })?.display_name ?? "";
          meals.push({
            date: slot.date,
            dayLabel: format(parseISO(slot.date), "EEE d", { locale: fr }),
            type: "souper",
            recipeName,
            cookName: cookName.split(" ")[0],
            eaterCount: (slot.eaters as string[])?.length ?? 0,
          });
        }

        for (const slot of lunchSlots ?? []) {
          const recipeName = (slot.recipe as unknown as { name: string } | null)?.name;
          if (!recipeName) continue;
          const cookName = (slot.cook as unknown as { display_name: string })?.display_name ?? "";
          meals.push({
            date: slot.date,
            dayLabel: format(parseISO(slot.date), "EEE d", { locale: fr }),
            type: "dejeuner",
            recipeName,
            cookName: cookName.split(" ")[0],
            eaterCount: (slot.eaters as string[])?.length ?? 0,
          });
        }

        meals.sort((a, b) => a.date.localeCompare(b.date));
      })
    );
  }

  await Promise.all(round2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Epicerie"
        action={
          <Link
            href="/grocery/staples"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
        }
      />
      <GroceryList
        items={items}
        staples={(staples ?? []).map((s) => ({
          ...s,
          default_quantity: s.default_quantity != null ? Number(s.default_quantity) : null,
        }))}
        meals={meals}
        currentUserId={user.id}
        dutyPerson={dutyPerson}
      />
    </div>
  );
}
