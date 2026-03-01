import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChoreList } from "@/components/chores/chore-list";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export default async function ChoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monday = getWeekMonday();
  const weekStartStr = toDateString(monday);

  // Get current week
  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("week_start", weekStartStr)
    .single();

  let chores: Array<{
    id: string;
    chore_name: string;
    status: "pending" | "done" | "skipped";
    completed_at: string | null;
    note: string | null;
    due_date: string | null;
    assigned_to: {
      id: string;
      display_name: string;
      color: string;
      avatar_emoji: string;
    };
  }> = [];

  if (week) {
    const { data } = await supabase
      .from("chore_slots")
      .select(
        "id, chore_name, status, completed_at, note, due_date, assigned_to:profiles!chore_slots_assigned_to_fkey(id, display_name, color, avatar_emoji)"
      )
      .eq("week_id", week.id)
      .order("due_date", { ascending: true, nullsFirst: true })
      .order("chore_name");

    if (data) {
      chores = data.map((slot) => ({
        ...slot,
        status: slot.status as "pending" | "done" | "skipped",
        due_date: slot.due_date ?? null,
        assigned_to: slot.assigned_to as unknown as {
          id: string;
          display_name: string;
          color: string;
          avatar_emoji: string;
        },
      }));
    }
  }

  const doneCount = chores.filter((c) => c.status === "done").length;
  const totalCount = chores.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chores"
        description={
          totalCount > 0
            ? `${doneCount}/${totalCount} done this week`
            : "No week generated yet"
        }
        action={
          <Link
            href="/chores/manage"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        }
      />
      <ChoreList chores={chores} currentUserId={user.id} />
    </div>
  );
}
