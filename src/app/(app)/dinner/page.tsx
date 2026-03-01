import { redirect } from "next/navigation";
import Link from "next/link";
import { addWeeks } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { WeekToggle } from "@/components/shared/week-toggle";
import {
  DinnerSlotList,
  type DinnerSlot,
} from "@/components/dinner/dinner-slot-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function DinnerPage({
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
    .select("id, display_name, color, avatar_emoji, avatar_url")
    .order("display_name");

  const profiles = profilesData ?? [];

  let slots: DinnerSlot[] = [];

  if (week) {
    const { data: dinnerData } = await supabase
      .from("dinner_slots")
      .select(
        "id, date, status, note, eaters, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, color, avatar_emoji, avatar_url)"
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
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diner"
        action={
          <Link
            href={`/lunch${isNext ? "?week=next" : ""}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Dejeuner →
          </Link>
        }
      />
      <WeekToggle />
      <DinnerSlotList
        slots={slots}
        profiles={profiles}
        currentUserId={user.id}
      />
    </div>
  );
}
