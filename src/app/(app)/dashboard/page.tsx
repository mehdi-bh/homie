import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Circle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWeekMonday, toDateString } from "@/lib/rotation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateWeekButton } from "@/components/dashboard/generate-week-button";
import { cn } from "@/lib/utils";
import { addWeeks } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_emoji")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || "there";
  const emoji = profile?.avatar_emoji || "👋";
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  // Get current week
  const monday = getWeekMonday();
  const weekStartStr = toDateString(monday);

  const { data: currentWeek } = await supabase
    .from("weeks")
    .select("id, generated")
    .eq("week_start", weekStartStr)
    .single();

  // Get next week status
  const nextMonday = addWeeks(monday, 1);
  const nextWeekStartStr = toDateString(nextMonday);

  const { data: nextWeek } = await supabase
    .from("weeks")
    .select("id, generated")
    .eq("week_start", nextWeekStartStr)
    .single();

  // Get chores for current week
  let myChores: Array<{
    id: string;
    chore_name: string;
    status: string;
  }> = [];

  if (currentWeek?.generated) {
    const { data } = await supabase
      .from("chore_slots")
      .select("id, chore_name, status")
      .eq("week_id", currentWeek.id)
      .eq("assigned_to", user.id)
      .order("chore_name");

    myChores = data ?? [];
  }

  const hasCurrentWeek = currentWeek?.generated;
  const hasNextWeek = nextWeek?.generated;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {emoji} Hello, {name}
        </h1>
        <p className="text-muted-foreground text-sm capitalize">{today}</p>
      </div>

      <div className="grid gap-4">
        {/* Chores card */}
        <Link href="/chores">
          <Card className="transition-colors active:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Chores
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCurrentWeek ? (
                <p className="text-sm text-muted-foreground">
                  No week generated yet
                </p>
              ) : myChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No chores assigned to you this week
                </p>
              ) : (
                <div className="space-y-2">
                  {myChores.map((chore) => {
                    const isDone = chore.status === "done";
                    return (
                      <div
                        key={chore.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        {isDone ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "capitalize",
                            isDone && "line-through text-muted-foreground"
                          )}
                        >
                          {chore.chore_name.replace(/_/g, " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder cards for future phases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dinner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grocery</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Car</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Week generation */}
      <div className="space-y-3">
        {!hasCurrentWeek && (
          <GenerateWeekButton
            label="Generate this week"
            targetDate={weekStartStr}
          />
        )}
        {!hasNextWeek && (
          <GenerateWeekButton
            label="Generate next week"
            targetDate={nextWeekStartStr}
          />
        )}
        <Link
          href="/settings"
          className="block text-sm text-muted-foreground text-center hover:underline"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
