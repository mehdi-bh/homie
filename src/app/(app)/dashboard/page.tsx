import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Circle, ArrowRight, UtensilsCrossed } from "lucide-react";
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
    .select("display_name, avatar_emoji, default_lunch")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || "there";
  const emoji = profile?.avatar_emoji || "👋";
  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const todayStr = toDateString(new Date());

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

  // Get today's dinner slot
  let todayDinner: {
    note: string | null;
    status: string;
    eaters: string[];
    cook: { display_name: string; avatar_emoji: string; color: string };
    isCook: boolean;
  } | null = null;

  // Get today's lunch slot
  let todayLunch: {
    cook: { display_name: string; avatar_emoji: string; color: string };
    isCook: boolean;
    myPreference: string | null;
    eating: boolean;
  } | null = null;

  if (currentWeek?.generated) {
    const { data: choresData } = await supabase
      .from("chore_slots")
      .select("id, chore_name, status")
      .eq("week_id", currentWeek.id)
      .eq("assigned_to", user.id)
      .order("chore_name");

    myChores = choresData ?? [];

    // Today's dinner
    const { data: dinnerData } = await supabase
      .from("dinner_slots")
      .select(
        "note, status, eaters, cook_id, cook:profiles!dinner_slots_cook_id_fkey(display_name, avatar_emoji, color)"
      )
      .eq("week_id", currentWeek.id)
      .eq("date", todayStr)
      .single();

    if (dinnerData) {
      const cook = dinnerData.cook as unknown as {
        display_name: string;
        avatar_emoji: string;
        color: string;
      };
      todayDinner = {
        note: dinnerData.note,
        status: dinnerData.status,
        eaters: (dinnerData.eaters ?? []) as string[],
        cook,
        isCook: dinnerData.cook_id === user.id,
      };
    }

    // Today's lunch
    const { data: lunchData } = await supabase
      .from("lunch_slots")
      .select(
        "id, cook_id, cook:profiles!lunch_slots_cook_id_fkey(display_name, avatar_emoji, color)"
      )
      .eq("week_id", currentWeek.id)
      .eq("date", todayStr)
      .single();

    if (lunchData) {
      const cook = lunchData.cook as unknown as {
        display_name: string;
        avatar_emoji: string;
        color: string;
      };

      // Get current user's preference for today
      const { data: prefData } = await supabase
        .from("lunch_preferences")
        .select("preference, eating")
        .eq("lunch_slot_id", lunchData.id)
        .eq("user_id", user.id)
        .single();

      const isEating = prefData?.eating ?? true;
      const myPref = isEating
        ? (prefData?.preference ?? profile?.default_lunch ?? null)
        : null;

      todayLunch = {
        cook,
        isCook: lunchData.cook_id === user.id,
        myPreference: myPref,
        eating: isEating,
      };
    }
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
        {/* Lunch card */}
        <Link href="/lunch">
          <Card className="transition-colors active:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Dejeuner
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCurrentWeek ? (
                <p className="text-sm text-muted-foreground">
                  Pas de semaine generee
                </p>
              ) : !todayLunch ? (
                <p className="text-sm text-muted-foreground">
                  Pas de dejeuner aujourd&apos;hui
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm">
                    {todayLunch.cook.avatar_emoji}{" "}
                    {todayLunch.isCook
                      ? "Tu cuisines"
                      : `${todayLunch.cook.display_name} cuisine`}
                  </p>
                  {!todayLunch.eating ? (
                    <p className="text-xs text-muted-foreground">
                      Tu ne manges pas
                    </p>
                  ) : todayLunch.myPreference ? (
                    <p className="text-xs text-muted-foreground">
                      Toi : {todayLunch.myPreference}
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Dinner card */}
        <Link href="/dinner">
          <Card className="transition-colors active:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Diner
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCurrentWeek ? (
                <p className="text-sm text-muted-foreground">
                  Pas de semaine generee
                </p>
              ) : !todayDinner ? (
                <p className="text-sm text-muted-foreground">
                  Pas de diner aujourd&apos;hui
                </p>
              ) : todayDinner.status === "skipped" ? (
                <p className="text-sm text-muted-foreground">Passe</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm">
                    {todayDinner.cook.avatar_emoji}{" "}
                    {todayDinner.isCook
                      ? "Tu cuisines"
                      : `${todayDinner.cook.display_name} cuisine`}
                  </p>
                  {todayDinner.note && (
                    <p className="text-sm">
                      <UtensilsCrossed className="h-3 w-3 inline mr-1" />
                      {todayDinner.note}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {todayDinner.eaters.length} pers.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Chores card */}
        <Link href="/chores">
          <Card className="transition-colors active:bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Taches
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCurrentWeek ? (
                <p className="text-sm text-muted-foreground">
                  Pas de semaine generee
                </p>
              ) : myChores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Rien pour toi cette semaine
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

        {/* Placeholder cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Bientot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Voiture</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Bientot</p>
          </CardContent>
        </Card>
      </div>

      {/* Week generation */}
      <div className="space-y-3">
        {!hasCurrentWeek && (
          <GenerateWeekButton
            label="Generer cette semaine"
            targetDate={weekStartStr}
          />
        )}
        {!hasNextWeek && (
          <GenerateWeekButton
            label="Generer la semaine prochaine"
            targetDate={nextWeekStartStr}
          />
        )}
        <Link
          href="/settings"
          className="block text-sm text-muted-foreground text-center hover:underline"
        >
          Parametres
        </Link>
      </div>
    </div>
  );
}
