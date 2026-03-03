import { redirect } from "next/navigation";
import Link from "next/link";
import { format, addWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Sun, Moon, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWeekMonday, getWeekDates, toDateString } from "@/lib/rotation";
import { MiniWeekPreview } from "@/components/dashboard/mini-week-preview";
import { ChoreChecklist } from "@/components/dashboard/chore-checklist";
import { TodoWidget } from "@/components/dashboard/todo-widget";
import { CalendarWidget } from "@/components/dashboard/calendar-widget";
import { PendingActions } from "@/components/dashboard/pending-actions";
import { UserAvatar } from "@/components/shared/user-avatar";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_emoji, avatar_url")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || "there";
  const emoji = profile?.avatar_emoji || "👋";
  const today = new Date();
  const todayStr = toDateString(today);
  const tomorrowStr = toDateString(addDays(today, 1));
  const todayLabel = format(today, "EEEE d MMMM", { locale: fr });

  const monday = getWeekMonday();
  const weekStartStr = toDateString(monday);
  const nextMonday = addWeeks(monday, 1);
  const nextWeekStartStr = toDateString(nextMonday);

  const [
    { data: currentWeek },
    { data: nextWeek },
    { data: pendingTodos },
    { data: todayEvents },
    { data: tomorrowEvents },
  ] = await Promise.all([
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
    supabase
      .from("todos")
      .select("id, title, completed, priority")
      .eq("completed", false)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("calendar_events")
      .select("id, title, date, start_time, all_day, category")
      .eq("date", todayStr)
      .order("start_time"),
    supabase
      .from("calendar_events")
      .select("id, title, date, start_time, all_day, category")
      .eq("date", tomorrowStr)
      .order("start_time"),
  ]);

  const hasCurrentWeek = currentWeek?.generated;
  const hasNextWeek = nextWeek?.generated;

  type ProfileInfo = {
    id: string;
    display_name: string;
    avatar_emoji: string;
    avatar_url: string | null;
    color: string;
  };

  let myChores: Array<{ id: string; chore_name: string; status: string; due_date: string | null }> = [];
  let todayDinner: {
    note: string | null;
    recipe_name: string | null;
    status: string;
    eaters: string[];
    cook: ProfileInfo;
    isCook: boolean;
  } | null = null;
  let todayLunch: {
    cook: ProfileInfo;
    isCook: boolean;
    recipe_name: string | null;
    eaters: string[];
  } | null = null;
  let tomorrowCookDinner = false;
  let tomorrowCookLunch = false;
  let pendingActions: Array<{ text: string; href: string; icon: "sun" | "moon" | "chore" | "grocery" | "todo" | "calendar" }> = [];

  let groceryItemCount = 0;
  let groceryUrgentCount = 0;
  let groceryDutyUserId: string | null = null;

  type MiniDay = {
    date: string;
    dinnerCook: ProfileInfo | null;
    dinnerStatus: string | null;
    lunchCook: ProfileInfo | null;
  };
  let miniWeek: MiniDay[] | null = null;
  let nextMiniWeek: MiniDay[] | null = null;

  // Round 2: fire ALL conditional queries in a single Promise.all
  type ConditionalResults = {
    choresData: typeof myChores | null;
    dinnerData: { note: string | null; status: string; eaters: unknown; cook_id: string; recipe: unknown; cook: unknown } | null;
    lunchData: { id: string; cook_id: string; eaters: unknown; recipe: unknown; cook: unknown } | null;
    allDinners: Array<{ date: string; status: string; cook_id: string | null; cook: unknown }> | null;
    allLunches: Array<{ date: string; cook_id: string | null; cook: unknown }> | null;
    tomorrowDinnerData: { cook_id: string | null } | null;
    tomorrowLunchData: { cook_id: string | null } | null;
    groceryItems: Array<{ id: string; priority: string }> | null;
    grocerySlot: { assigned_to: string | null } | null;
    nextDinners: Array<{ date: string; status: string; cook_id: string | null; cook: unknown }> | null;
    nextLunches: Array<{ date: string; cook_id: string | null; cook: unknown }> | null;
  };

  const conditional: ConditionalResults = {
    choresData: null, dinnerData: null, lunchData: null,
    allDinners: null, allLunches: null,
    tomorrowDinnerData: null, tomorrowLunchData: null,
    groceryItems: null, grocerySlot: null,
    nextDinners: null, nextLunches: null,
  };

  const queries: Array<Promise<void>> = [];

  if (hasCurrentWeek) {
    queries.push(
      Promise.all([
        supabase.from("chore_slots").select("id, chore_name, status, due_date").eq("week_id", currentWeek!.id).eq("assigned_to", user.id).order("chore_name"),
        supabase.from("dinner_slots").select("note, status, eaters, cook_id, recipe:recipes!dinner_slots_recipe_id_fkey(name), cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", currentWeek!.id).eq("date", todayStr).single(),
        supabase.from("lunch_slots").select("id, cook_id, eaters, recipe:recipes!lunch_slots_recipe_id_fkey(name), cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", currentWeek!.id).eq("date", todayStr).single(),
        supabase.from("dinner_slots").select("date, status, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", currentWeek!.id).order("date"),
        supabase.from("lunch_slots").select("date, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", currentWeek!.id).order("date"),
        supabase.from("dinner_slots").select("cook_id").eq("week_id", currentWeek!.id).eq("date", tomorrowStr).single(),
        supabase.from("lunch_slots").select("cook_id").eq("week_id", currentWeek!.id).eq("date", tomorrowStr).single(),
        supabase.from("grocery_items").select("id, priority").eq("archived", false).eq("checked", false),
        supabase.from("grocery_slots").select("assigned_to").eq("week_id", currentWeek!.id).single(),
      ]).then(([chores, dinner, lunch, allD, allL, tmrwD, tmrwL, grocery, gSlot]) => {
        conditional.choresData = chores.data as typeof myChores;
        conditional.dinnerData = dinner.data as ConditionalResults["dinnerData"];
        conditional.lunchData = lunch.data as ConditionalResults["lunchData"];
        conditional.allDinners = allD.data as ConditionalResults["allDinners"];
        conditional.allLunches = allL.data as ConditionalResults["allLunches"];
        conditional.tomorrowDinnerData = tmrwD.data as ConditionalResults["tomorrowDinnerData"];
        conditional.tomorrowLunchData = tmrwL.data as ConditionalResults["tomorrowLunchData"];
        conditional.groceryItems = grocery.data as ConditionalResults["groceryItems"];
        conditional.grocerySlot = gSlot.data as ConditionalResults["grocerySlot"];
      })
    );
  }

  if (hasNextWeek) {
    queries.push(
      Promise.all([
        supabase.from("dinner_slots").select("date, status, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", nextWeek!.id).order("date"),
        supabase.from("lunch_slots").select("date, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)").eq("week_id", nextWeek!.id).order("date"),
      ]).then(([nextD, nextL]) => {
        conditional.nextDinners = nextD.data as ConditionalResults["nextDinners"];
        conditional.nextLunches = nextL.data as ConditionalResults["nextLunches"];
      })
    );
  }

  await Promise.all(queries);

  if (hasCurrentWeek) {
    myChores = conditional.choresData ?? [];

    const uncheckedItems = conditional.groceryItems ?? [];
    groceryItemCount = uncheckedItems.length;
    groceryUrgentCount = uncheckedItems.filter((i) => i.priority === "urgent").length;
    groceryDutyUserId = conditional.grocerySlot?.assigned_to ?? null;

    if (conditional.dinnerData) {
      const cook = conditional.dinnerData.cook as unknown as ProfileInfo;
      todayDinner = {
        note: conditional.dinnerData.note,
        recipe_name: (conditional.dinnerData.recipe as unknown as { name: string } | null)?.name ?? null,
        status: conditional.dinnerData.status,
        eaters: (conditional.dinnerData.eaters ?? []) as string[],
        cook,
        isCook: conditional.dinnerData.cook_id === user.id,
      };
    }

    if (conditional.lunchData) {
      const cook = conditional.lunchData.cook as unknown as ProfileInfo;
      todayLunch = {
        cook,
        isCook: conditional.lunchData.cook_id === user.id,
        recipe_name: (conditional.lunchData.recipe as unknown as { name: string } | null)?.name ?? null,
        eaters: (conditional.lunchData.eaters ?? []) as string[],
      };
    }

    tomorrowCookDinner = conditional.tomorrowDinnerData?.cook_id === user.id;
    tomorrowCookLunch = conditional.tomorrowLunchData?.cook_id === user.id;

    function buildMiniWeek(
      dates: Date[],
      dinners: ConditionalResults["allDinners"],
      lunches: ConditionalResults["allLunches"]
    ): MiniDay[] {
      const dinnerMap = new Map<string, { cook: unknown; status: string; cook_id: string | null }>();
      for (const d of dinners ?? []) dinnerMap.set(d.date, d);
      const lunchMap = new Map<string, { cook: unknown; cook_id: string | null }>();
      for (const l of lunches ?? []) lunchMap.set(l.date, l);

      return dates.map((date) => {
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
    }

    miniWeek = buildMiniWeek(getWeekDates(monday), conditional.allDinners, conditional.allLunches);

    if (tomorrowCookLunch) {
      pendingActions.push({
        text: "Tu cuisines le lunch demain",
        href: "/meals?tab=dejeuner",
        icon: "sun",
      });
    }
    if (tomorrowCookDinner) {
      pendingActions.push({
        text: "Tu cuisines le souper demain",
        href: "/meals",
        icon: "moon",
      });
    }

    const pendingChores = myChores.filter((c) => c.status === "pending");
    if (pendingChores.length > 0) {
      pendingActions.push({
        text: `${pendingChores.length} tache${pendingChores.length > 1 ? "s" : ""} a faire`,
        href: "/chores",
        icon: "chore",
      });
    }

    if (groceryDutyUserId === user.id && groceryItemCount > 0) {
      pendingActions.push({
        text: `${groceryItemCount} article${groceryItemCount > 1 ? "s" : ""} a acheter`,
        href: "/grocery",
        icon: "grocery",
      });
    }
  }

  const todoCount = pendingTodos?.length ?? 0;
  if (todoCount > 0) {
    pendingActions.push({
      text: `${todoCount} tache${todoCount > 1 ? "s" : ""} a faire`,
      href: "/todos",
      icon: "todo",
    });
  }

  const todayEventCount = todayEvents?.length ?? 0;
  if (todayEventCount > 0) {
    pendingActions.push({
      text: `${todayEventCount} evenement${todayEventCount > 1 ? "s" : ""} aujourd'hui`,
      href: "/agenda",
      icon: "calendar",
    });
  }

  if (hasNextWeek) {
    const nextDates = getWeekDates(nextMonday);
    const dinnerMap = new Map<string, { cook: unknown; status: string; cook_id: string | null }>();
    for (const d of conditional.nextDinners ?? []) dinnerMap.set(d.date, d);
    const lunchMap = new Map<string, { cook: unknown; cook_id: string | null }>();
    for (const l of conditional.nextLunches ?? []) lunchMap.set(l.date, l);

    nextMiniWeek = nextDates.map((date) => {
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
  }

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center gap-3.5">
        <UserAvatar src={profile?.avatar_url} fallback={emoji} size="lg" />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground text-sm capitalize">{todayLabel}</p>
        </div>
      </div>

      {/* Pending actions */}
      <PendingActions actions={pendingActions} />

      {/* Chores checklist */}
      {hasCurrentWeek && myChores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mes taches</p>
            <Link href="/chores" className="text-xs text-primary font-medium">
              Tout voir
            </Link>
          </div>
          <ChoreChecklist chores={myChores} />
        </div>
      )}

      {/* Todo widget */}
      {(pendingTodos?.length ?? 0) > 0 && (
        <TodoWidget
          todos={(pendingTodos ?? []).slice(0, 3)}
          totalCount={pendingTodos?.length ?? 0}
        />
      )}

      {/* Calendar widget */}
      {((todayEvents?.length ?? 0) > 0 || (tomorrowEvents?.length ?? 0) > 0) && (
        <CalendarWidget
          todayEvents={todayEvents ?? []}
          tomorrowEvents={tomorrowEvents ?? []}
        />
      )}

      {/* Meals + Grocery */}
      <div className="rounded-2xl bg-card shadow-sm border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repas</p>
          <Link href="/meals" className="flex items-center gap-1 text-xs text-primary font-medium">
            Tout voir
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-0.5">
          {/* Lunch row */}
          <Link
            href="/meals?tab=dejeuner"
            className="flex items-center gap-3 px-1 py-2.5 rounded-xl transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            {!hasCurrentWeek ? (
              <span className="text-sm text-muted-foreground">Pas de semaine</span>
            ) : !todayLunch ? (
              <span className="text-sm text-muted-foreground">Lunch — pas prevu</span>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {todayLunch.recipe_name ?? "Pas encore decide"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <UserAvatar src={todayLunch.cook.avatar_url} fallback={todayLunch.cook.avatar_emoji} size="xs" />
                  <span className="text-xs text-muted-foreground">
                    {todayLunch.isCook ? "Toi" : todayLunch.cook.display_name.split(" ")[0]}
                  </span>
                </div>
              </>
            )}
          </Link>

          {/* Dinner row */}
          <Link
            href="/meals"
            className="flex items-center gap-3 px-1 py-2.5 rounded-xl transition-all active:scale-[0.98] min-h-[44px]"
          >
            <Moon className="h-4 w-4 text-indigo-400 shrink-0" />
            {!hasCurrentWeek ? (
              <span className="text-sm text-muted-foreground">Pas de semaine</span>
            ) : !todayDinner ? (
              <span className="text-sm text-muted-foreground">Souper — pas prevu</span>
            ) : todayDinner.status === "skipped" ? (
              <span className="text-sm text-muted-foreground line-through">Souper passe</span>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {todayDinner.recipe_name ?? todayDinner.note ?? "Pas encore decide"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <UserAvatar src={todayDinner.cook.avatar_url} fallback={todayDinner.cook.avatar_emoji} size="xs" />
                  <span className="text-xs text-muted-foreground">
                    {todayDinner.isCook ? "Toi" : todayDinner.cook.display_name.split(" ")[0]}
                  </span>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Grocery row inside same card */}
        {hasCurrentWeek && (
          <>
            <div className="border-t border-border/40 my-2" />
            <Link
              href="/grocery"
              className="flex items-center gap-3 px-1 py-2.5 rounded-xl transition-all active:scale-[0.98] min-h-[44px]"
            >
              <ShoppingCart className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium flex-1">
                Courses
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {groceryUrgentCount > 0 && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full dark:bg-amber-900/30">
                    {groceryUrgentCount} urgent
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {groceryItemCount} article{groceryItemCount !== 1 ? "s" : ""}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Mini week preview */}
      {(miniWeek || nextMiniWeek) && (
        <MiniWeekPreview
          currentWeek={miniWeek}
          nextWeek={nextMiniWeek}
          todayStr={todayStr}
        />
      )}

      {/* Settings link */}
      <Link
        href="/settings"
        className="block text-sm text-muted-foreground text-center py-2 active:text-foreground transition-colors"
      >
        Parametres
      </Link>
    </div>
  );
}
