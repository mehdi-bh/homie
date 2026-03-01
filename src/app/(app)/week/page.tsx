import { redirect } from "next/navigation";
import { addWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WeekToggle } from "@/components/shared/week-toggle";
import { WeekGrid } from "@/components/week/week-grid";
import { getWeekMonday, getWeekDates, toDateString } from "@/lib/rotation";
import { GenerateWeekButton } from "@/components/dashboard/generate-week-button";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const isNext = params.week === "next";
  const monday = isNext ? addWeeks(getWeekMonday(), 1) : getWeekMonday();
  const weekStartStr = toDateString(monday);
  const dates = getWeekDates(monday);

  const { data: week } = await supabase
    .from("weeks")
    .select("id, generated")
    .eq("week_start", weekStartStr)
    .single();

  if (!week?.generated) {
    return (
      <div className="space-y-6">
        <PageHeader title="Semaine" />
        <WeekToggle />
        <div className="py-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Pas de semaine generee.
          </p>
          <GenerateWeekButton
            label={isNext ? "Generer la semaine prochaine" : "Generer cette semaine"}
            targetDate={weekStartStr}
          />
        </div>
      </div>
    );
  }

  // Fetch all data for the week in parallel
  const [
    { data: dinnerData },
    { data: lunchData },
    { data: choreData },
  ] = await Promise.all([
    supabase
      .from("dinner_slots")
      .select(
        "id, date, status, note, eaters, cook_id, recipe:recipes!dinner_slots_recipe_id_fkey(name), cook:profiles!dinner_slots_cook_id_fkey(id, display_name, color, avatar_emoji, avatar_url)"
      )
      .eq("week_id", week.id)
      .order("date"),
    supabase
      .from("lunch_slots")
      .select(
        "id, date, status, eaters, cook_id, recipe:recipes!lunch_slots_recipe_id_fkey(name), cook:profiles!lunch_slots_cook_id_fkey(id, display_name, color, avatar_emoji, avatar_url)"
      )
      .eq("week_id", week.id)
      .order("date"),
    supabase
      .from("chore_slots")
      .select(
        "id, chore_name, status, due_date, assigned_to:profiles!chore_slots_assigned_to_fkey(id, display_name, color, avatar_emoji, avatar_url)"
      )
      .eq("week_id", week.id)
      .order("chore_name"),
  ]);

  // Build lookups by date
  const dinners = dinnerData ?? [];
  const dinnerByDate = new Map(dinners.map((s) => [s.date, s]));

  const lunches = lunchData ?? [];
  const lunchByDate = new Map(lunches.map((s) => [s.date, s]));

  // Group chores: chores with a due_date go on that day, others go on monday
  type ProfileInfo = { id: string; display_name: string; color: string; avatar_emoji: string; avatar_url: string | null };
  const choresByDate = new Map<string, Array<{ name: string; status: string; assignedTo: ProfileInfo }>>();
  for (const c of choreData ?? []) {
    const dateKey = c.due_date ?? weekStartStr; // weekly chores go on monday
    const list = choresByDate.get(dateKey) ?? [];
    list.push({
      name: c.chore_name,
      status: c.status as string,
      assignedTo: c.assigned_to as unknown as ProfileInfo,
    });
    choresByDate.set(dateKey, list);
  }

  const weekDays = dates.map((date) => {
    const dateStr = toDateString(date);
    const dinner = dinnerByDate.get(dateStr);
    const lunch = lunchByDate.get(dateStr);

    return {
      date: dateStr,
      dinner: dinner
        ? {
            cookEmoji: (dinner.cook as unknown as ProfileInfo).avatar_emoji,
            cookAvatarUrl: (dinner.cook as unknown as ProfileInfo).avatar_url,
            cookName: (dinner.cook as unknown as ProfileInfo).display_name,
            cookColor: (dinner.cook as unknown as ProfileInfo).color,
            cookId: dinner.cook_id!,
            note: dinner.note,
            recipeName: (dinner.recipe as unknown as { name: string } | null)?.name ?? null,
            status: dinner.status as string,
            eaterCount: (dinner.eaters as string[])?.length ?? 0,
          }
        : null,
      lunch: lunch
        ? {
            cookEmoji: (lunch.cook as unknown as ProfileInfo).avatar_emoji,
            cookAvatarUrl: (lunch.cook as unknown as ProfileInfo).avatar_url,
            cookName: (lunch.cook as unknown as ProfileInfo).display_name,
            cookColor: (lunch.cook as unknown as ProfileInfo).color,
            cookId: lunch.cook_id!,
            recipeName: (lunch.recipe as unknown as { name: string } | null)?.name ?? null,
            status: lunch.status as string,
            eaterCount: (lunch.eaters as string[])?.length ?? 0,
          }
        : null,
      chores: choresByDate.get(dateStr) ?? [],
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Semaine" />
      <WeekToggle />
      <WeekGrid days={weekDays} currentUserId={user.id} />
    </div>
  );
}
