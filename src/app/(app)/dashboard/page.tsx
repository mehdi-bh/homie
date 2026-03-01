import { redirect } from "next/navigation";
import Link from "next/link";
import { format, addWeeks, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, ListChecks, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWeekMonday, getWeekDates, toDateString } from "@/lib/rotation";
import { Card, CardContent } from "@/components/ui/card";
import { GenerateWeekButton } from "@/components/dashboard/generate-week-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_emoji, avatar_url, default_lunch")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || "there";
  const emoji = profile?.avatar_emoji || "👋";
  const today = new Date();
  const todayStr = toDateString(today);
  const tomorrowStr = toDateString(addDays(today, 1));
  const todayLabel = format(today, "EEEE d MMMM", { locale: fr });

  // Get current and next week
  const monday = getWeekMonday();
  const weekStartStr = toDateString(monday);
  const nextMonday = addWeeks(monday, 1);
  const nextWeekStartStr = toDateString(nextMonday);

  const [{ data: currentWeek }, { data: nextWeek }] = await Promise.all([
    supabase
      .from("weeks")
      .select("id, generated")
      .eq("week_start", weekStartStr)
      .single(),
    supabase
      .from("weeks")
      .select("id, generated")
      .eq("week_start", nextWeekStartStr)
      .single(),
  ]);

  const hasCurrentWeek = currentWeek?.generated;
  const hasNextWeek = nextWeek?.generated;

  // Fetch today's data in parallel (only if week exists)
  type ProfileInfo = {
    id: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url: string | null;
    color: string;
  };

  let myChores: Array<{ id: string; chore_name: string; status: string }> = [];
  let todayDinner: {
    note: string | null;
    status: string;
    eaters: string[];
    cook: ProfileInfo;
    isCook: boolean;
  } | null = null;
  let todayLunch: {
    cook: ProfileInfo;
    isCook: boolean;
    myPreference: string | null;
    eating: boolean;
  } | null = null;
  let tomorrowCookDinner = false;
  let tomorrowCookLunch = false;
  let pendingActions: Array<{ text: string; href: string }> = [];

  // Mini week data
  let miniWeek: Array<{
    date: string;
    dinnerCook: ProfileInfo | null;
    dinnerStatus: string | null;
    lunchCook: ProfileInfo | null;
  }> = [];

  if (hasCurrentWeek) {
    const [
      { data: choresData },
      { data: dinnerData },
      { data: lunchData },
      { data: allDinners },
      { data: allLunches },
      { data: tomorrowDinnerData },
      { data: tomorrowLunchData },
    ] = await Promise.all([
      supabase
        .from("chore_slots")
        .select("id, chore_name, status")
        .eq("week_id", currentWeek!.id)
        .eq("assigned_to", user.id)
        .order("chore_name"),
      supabase
        .from("dinner_slots")
        .select(
          "note, status, eaters, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .eq("date", todayStr)
        .single(),
      supabase
        .from("lunch_slots")
        .select(
          "id, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .eq("date", todayStr)
        .single(),
      // All dinners for mini week
      supabase
        .from("dinner_slots")
        .select(
          "date, status, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .order("date"),
      // All lunches for mini week
      supabase
        .from("lunch_slots")
        .select(
          "date, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .order("date"),
      // Tomorrow's dinner
      supabase
        .from("dinner_slots")
        .select("cook_id")
        .eq("week_id", currentWeek!.id)
        .eq("date", tomorrowStr)
        .single(),
      // Tomorrow's lunch
      supabase
        .from("lunch_slots")
        .select("cook_id")
        .eq("week_id", currentWeek!.id)
        .eq("date", tomorrowStr)
        .single(),
    ]);

    myChores = choresData ?? [];

    // Today's dinner
    if (dinnerData) {
      const cook = dinnerData.cook as unknown as ProfileInfo;
      todayDinner = {
        note: dinnerData.note,
        status: dinnerData.status,
        eaters: (dinnerData.eaters ?? []) as string[],
        cook,
        isCook: dinnerData.cook_id === user.id,
      };
    }

    // Today's lunch
    if (lunchData) {
      const cook = lunchData.cook as unknown as ProfileInfo;
      const { data: prefData } = await supabase
        .from("lunch_preferences")
        .select("preference, eating")
        .eq("lunch_slot_id", lunchData.id)
        .eq("user_id", user.id)
        .single();

      const isEating = prefData?.eating ?? true;
      todayLunch = {
        cook,
        isCook: lunchData.cook_id === user.id,
        myPreference: isEating
          ? (prefData?.preference ?? profile?.default_lunch ?? null)
          : null,
        eating: isEating,
      };
    }

    // Tomorrow checks
    tomorrowCookDinner = tomorrowDinnerData?.cook_id === user.id;
    tomorrowCookLunch = tomorrowLunchData?.cook_id === user.id;

    // Build mini week
    const dates = getWeekDates(monday);
    const dinnerMap = new Map<string, { cook: unknown; status: string; cook_id: string | null }>();
    for (const d of allDinners ?? []) {
      dinnerMap.set(d.date, d);
    }
    const lunchMap = new Map<string, { cook: unknown; cook_id: string | null }>();
    for (const l of allLunches ?? []) {
      lunchMap.set(l.date, l);
    }

    miniWeek = dates.map((date) => {
      const dateStr = toDateString(date);
      const d = dinnerMap.get(dateStr);
      const l = lunchMap.get(dateStr);
      return {
        date: dateStr,
        dinnerCook: d ? (d.cook as unknown as ProfileInfo) : null,
        dinnerStatus: d ? d.status : null,
        lunchCook: l ? (l.cook as unknown as ProfileInfo) : null,
      };
    });

    // Pending actions
    if (tomorrowCookDinner) {
      pendingActions.push({
        text: "Tu cuisines le diner demain",
        href: "/dinner",
      });
    }
    if (tomorrowCookLunch) {
      pendingActions.push({
        text: "Tu cuisines le dejeuner demain",
        href: "/lunch",
      });
    }

    const pendingChores = myChores.filter((c) => c.status === "pending");
    if (pendingChores.length > 0) {
      pendingActions.push({
        text: `${pendingChores.length} tache${pendingChores.length > 1 ? "s" : ""} a faire`,
        href: "/chores",
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <UserAvatar src={profile?.avatar_url} fallback={emoji} size="lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground text-sm capitalize">{todayLabel}</p>
        </div>
      </div>

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-1.5">
          {pendingActions.map((action) => (
            <Link
              key={action.text}
              href={action.href}
              className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5 text-sm transition-colors active:bg-primary/10"
            >
              <AlertCircle className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1">{action.text}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {/* Today's cards */}
      <div className="grid gap-3">
        {/* Lunch */}
        <Link href="/lunch">
          <Card className="transition-colors active:bg-muted/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{
                    backgroundColor: todayLunch?.cook.color
                      ? todayLunch.cook.color + "15"
                      : undefined,
                  }}
                >
                  <UserAvatar src={todayLunch?.cook.avatar_url} fallback={todayLunch?.cook.avatar_emoji ?? "\u{1F37D}"} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Dejeuner</p>
                  {!hasCurrentWeek ? (
                    <p className="text-xs text-muted-foreground">
                      Pas de semaine
                    </p>
                  ) : !todayLunch ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {todayLunch.isCook
                        ? "Tu cuisines"
                        : `${todayLunch.cook.display_name} cuisine`}
                      {todayLunch.eating && todayLunch.myPreference
                        ? ` · ${todayLunch.myPreference}`
                        : ""}
                      {!todayLunch.eating ? " · Pas la" : ""}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Dinner */}
        <Link href="/dinner">
          <Card className="transition-colors active:bg-muted/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{
                    backgroundColor: todayDinner?.cook.color
                      ? todayDinner.cook.color + "15"
                      : undefined,
                  }}
                >
                  <UserAvatar src={todayDinner?.cook.avatar_url} fallback={todayDinner?.cook.avatar_emoji ?? "\u{1F373}"} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Diner</p>
                  {!hasCurrentWeek ? (
                    <p className="text-xs text-muted-foreground">
                      Pas de semaine
                    </p>
                  ) : !todayDinner ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : todayDinner.status === "skipped" ? (
                    <p className="text-xs text-muted-foreground">Passe</p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate">
                      {todayDinner.isCook
                        ? "Tu cuisines"
                        : `${todayDinner.cook.display_name} cuisine`}
                      {todayDinner.note ? ` · ${todayDinner.note}` : ""}
                      {` · ${todayDinner.eaters.length} pers.`}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Chores */}
        <Link href="/chores">
          <Card className="transition-colors active:bg-muted/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Taches</p>
                  {!hasCurrentWeek ? (
                    <p className="text-xs text-muted-foreground">
                      Pas de semaine
                    </p>
                  ) : myChores.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Rien cette semaine
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {myChores.map((chore) => {
                        const isDone = chore.status === "done";
                        return (
                          <span
                            key={chore.id}
                            className={cn(
                              "text-xs capitalize",
                              isDone
                                ? "text-green-600 line-through"
                                : "text-foreground"
                            )}
                          >
                            {chore.chore_name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Mini week preview */}
      {hasCurrentWeek && miniWeek.length > 0 && (
        <Link href="/week" className="block">
          <div className="rounded-xl border p-3 transition-colors active:bg-muted/50">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                Cette semaine
              </p>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-x-1 items-center">
              <div />
              {miniWeek.map((day) => {
                const isToday = day.date === todayStr;
                const parsed = parseISO(day.date);
                const dayLetter = format(parsed, "EEEEE", { locale: fr });
                return (
                  <span
                    key={day.date}
                    className={cn(
                      "text-[10px] uppercase text-center",
                      isToday ? "text-primary font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {dayLetter}
                  </span>
                );
              })}

              {/* Lunch row */}
              <span className="text-[10px] text-muted-foreground pr-1.5">Dej.</span>
              {miniWeek.map((day) => {
                const isToday = day.date === todayStr;
                const isPast = day.date < todayStr;
                return (
                  <div
                    key={day.date + "-l"}
                    className={cn(
                      "flex justify-center py-0.5 rounded-t-md",
                      isToday && "bg-primary/10",
                      isPast && "opacity-40"
                    )}
                  >
                    {day.lunchCook ? (
                      <UserAvatar src={day.lunchCook.avatar_url} fallback={day.lunchCook.avatar_emoji} size="sm" className="h-5 w-5 text-sm" />
                    ) : (
                      <span className="text-sm leading-none">&middot;</span>
                    )}
                  </div>
                );
              })}

              {/* Dinner row */}
              <span className="text-[10px] text-muted-foreground pr-1.5">Diner</span>
              {miniWeek.map((day) => {
                const isToday = day.date === todayStr;
                const isPast = day.date < todayStr;
                const isSkipped = day.dinnerStatus === "skipped";
                return (
                  <div
                    key={day.date + "-d"}
                    className={cn(
                      "flex justify-center py-0.5 rounded-b-md",
                      isToday && "bg-primary/10",
                      isPast && "opacity-40"
                    )}
                  >
                    {day.dinnerCook ? (
                      <UserAvatar src={day.dinnerCook.avatar_url} fallback={day.dinnerCook.avatar_emoji} size="sm" className={cn("h-5 w-5 text-sm", isSkipped && "opacity-30")} />
                    ) : (
                      <span className="text-sm leading-none">&middot;</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Link>
      )}

      {/* Week generation */}
      {(!hasCurrentWeek || !hasNextWeek) && (
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
        </div>
      )}

      {/* Settings link */}
      <Link
        href="/settings"
        className="block text-sm text-muted-foreground text-center hover:underline"
      >
        Parametres
      </Link>
    </div>
  );
}
