import { redirect } from "next/navigation";
import Link from "next/link";
import { addWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WeekToggle } from "@/components/shared/week-toggle";
import {
  LunchDayList,
  type LunchSlot,
  type Profile,
} from "@/components/lunch/lunch-day-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function LunchPage({
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

  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("week_start", weekStartStr)
    .single();

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, color, avatar_emoji, default_lunch")
    .order("display_name");

  const profiles: Profile[] = (profilesData ?? []).map((p) => ({
    ...p,
    default_lunch: p.default_lunch ?? null,
  }));

  let slots: LunchSlot[] = [];

  if (week) {
    const { data: lunchData } = await supabase
      .from("lunch_slots")
      .select(
        "id, date, status, note, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, color, avatar_emoji)"
      )
      .eq("week_id", week.id)
      .order("date");

    const slotIds = (lunchData ?? []).map((s) => s.id);
    let prefsData: Array<{
      id: string;
      lunch_slot_id: string;
      user_id: string;
      preference: string | null;
      eating: boolean;
      note: string | null;
    }> = [];

    if (slotIds.length > 0) {
      const { data } = await supabase
        .from("lunch_preferences")
        .select("id, lunch_slot_id, user_id, preference, eating, note")
        .in("lunch_slot_id", slotIds);
      prefsData = (data ?? []) as typeof prefsData;
    }

    slots = (lunchData ?? []).map((slot) => ({
      id: slot.id,
      date: slot.date,
      status: slot.status as LunchSlot["status"],
      note: slot.note ?? null,
      cook_id: slot.cook_id!,
      cook: slot.cook as unknown as LunchSlot["cook"],
      preferences: prefsData.filter((p) => p.lunch_slot_id === slot.id),
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dejeuner"
        action={
          <Link
            href={`/dinner${isNext ? "?week=next" : ""}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Diner →
          </Link>
        }
      />
      <WeekToggle />
      <LunchDayList
        slots={slots}
        profiles={profiles}
        currentUserId={user.id}
      />
    </div>
  );
}
