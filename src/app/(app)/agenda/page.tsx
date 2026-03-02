import { redirect } from "next/navigation";
import { addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { toDateString } from "@/lib/rotation";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const view = (params.view as "day" | "week" | "month") || "week";
  const dateParam = params.date;
  const baseDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();

  // Calculate date range based on view
  let rangeStart: Date;
  let rangeEnd: Date;

  if (view === "day") {
    rangeStart = baseDate;
    rangeEnd = baseDate;
  } else if (view === "month") {
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(baseDate);
    rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  } else {
    rangeStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    rangeEnd = addDays(rangeStart, 6);
  }

  const [{ data: events }, { data: profiles }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, user_id, title, date, start_time, end_time, all_day, category, note, created_at")
      .gte("date", toDateString(rangeStart))
      .lte("date", toDateString(rangeEnd))
      .order("date")
      .order("start_time"),
    supabase.from("profiles").select("id, display_name, avatar_emoji, avatar_url, color"),
  ]);

  return (
    <AgendaView
      events={events ?? []}
      profiles={profiles ?? []}
      currentUserId={user.id}
      initialView={view}
      initialDate={toDateString(baseDate)}
    />
  );
}
