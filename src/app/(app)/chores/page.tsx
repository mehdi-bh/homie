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
      avatar_url: string | null;
    };
  }> = [];

  if (week) {
    const { data } = await supabase
      .from("chore_slots")
      .select(
        "id, chore_name, status, completed_at, note, due_date, assigned_to:profiles!chore_slots_assigned_to_fkey(id, display_name, color, avatar_emoji, avatar_url)"
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
          avatar_url: string | null;
        },
      }));
    }
  }

  const doneCount = chores.filter((c) => c.status === "done").length;
  const totalCount = chores.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Taches menageres"
        description={
          totalCount > 0
            ? `${doneCount}/${totalCount} faites cette semaine`
            : "Aucune semaine generee"
        }
        action={
          <Link
            href="/chores/manage"
            className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground active:bg-muted transition-all active:scale-90"
          >
            <Settings className="h-5 w-5" />
          </Link>
        }
      />
      <ChoreList chores={chores} currentUserId={user.id} />
    </div>
  );
}
