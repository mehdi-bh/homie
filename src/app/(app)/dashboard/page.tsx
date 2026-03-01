import { redirect } from "next/navigation";
import Link from "next/link";
import { format, addWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, Sun, Moon, AlertCircle, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWeekMonday, getWeekDates, toDateString } from "@/lib/rotation";
import { GenerateWeekButton } from "@/components/dashboard/generate-week-button";
import { MiniWeekPreview } from "@/components/dashboard/mini-week-preview";
import { ChoreChecklist } from "@/components/dashboard/chore-checklist";
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
  let pendingActions: Array<{ text: string; href: string }> = [];

  // Grocery data
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

  if (hasCurrentWeek) {
    const [
      { data: choresData },
      { data: dinnerData },
      { data: lunchData },
      { data: allDinners },
      { data: allLunches },
      { data: tomorrowDinnerData },
      { data: tomorrowLunchData },
      { data: groceryItems },
      { data: grocerySlot },
    ] = await Promise.all([
      supabase
        .from("chore_slots")
        .select("id, chore_name, status, due_date")
        .eq("week_id", currentWeek!.id)
        .eq("assigned_to", user.id)
        .order("chore_name"),
      supabase
        .from("dinner_slots")
        .select(
          "note, status, eaters, cook_id, recipe:recipes!dinner_slots_recipe_id_fkey(name), cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .eq("date", todayStr)
        .single(),
      supabase
        .from("lunch_slots")
        .select(
          "id, cook_id, eaters, recipe:recipes!lunch_slots_recipe_id_fkey(name), cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .eq("date", todayStr)
        .single(),
      supabase
        .from("dinner_slots")
        .select(
          "date, status, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .order("date"),
      supabase
        .from("lunch_slots")
        .select(
          "date, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", currentWeek!.id)
        .order("date"),
      supabase
        .from("dinner_slots")
        .select("cook_id")
        .eq("week_id", currentWeek!.id)
        .eq("date", tomorrowStr)
        .single(),
      supabase
        .from("lunch_slots")
        .select("cook_id")
        .eq("week_id", currentWeek!.id)
        .eq("date", tomorrowStr)
        .single(),
      supabase
        .from("grocery_items")
        .select("id, priority")
        .eq("archived", false)
        .eq("checked", false),
      supabase
        .from("grocery_slots")
        .select("assigned_to")
        .eq("week_id", currentWeek!.id)
        .single(),
    ]);

    myChores = choresData ?? [];

    // Grocery
    const uncheckedItems = groceryItems ?? [];
    groceryItemCount = uncheckedItems.length;
    groceryUrgentCount = uncheckedItems.filter((i) => i.priority === "urgent").length;
    groceryDutyUserId = grocerySlot?.assigned_to ?? null;

    // Today's dinner
    if (dinnerData) {
      const cook = dinnerData.cook as unknown as ProfileInfo;
      todayDinner = {
        note: dinnerData.note,
        recipe_name: (dinnerData.recipe as unknown as { name: string } | null)?.name ?? null,
        status: dinnerData.status,
        eaters: (dinnerData.eaters ?? []) as string[],
        cook,
        isCook: dinnerData.cook_id === user.id,
      };
    }

    // Today's lunch (new model - recipe + eaters)
    if (lunchData) {
      const cook = lunchData.cook as unknown as ProfileInfo;
      todayLunch = {
        cook,
        isCook: lunchData.cook_id === user.id,
        recipe_name: (lunchData.recipe as unknown as { name: string } | null)?.name ?? null,
        eaters: (lunchData.eaters ?? []) as string[],
      };
    }

    // Tomorrow checks
    tomorrowCookDinner = tomorrowDinnerData?.cook_id === user.id;
    tomorrowCookLunch = tomorrowLunchData?.cook_id === user.id;

    // Build mini week
    function buildMiniWeek(
      dates: Date[],
      dinners: typeof allDinners,
      lunches: typeof allLunches
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

    miniWeek = buildMiniWeek(getWeekDates(monday), allDinners, allLunches);

    // Pending actions
    if (tomorrowCookDinner) {
      pendingActions.push({
        text: "Tu cuisines le souper demain",
        href: "/meals",
      });
    }
    if (tomorrowCookLunch) {
      pendingActions.push({
        text: "Tu cuisines le dejeuner demain",
        href: "/meals?tab=dejeuner",
      });
    }

    const pendingChores = myChores.filter((c) => c.status === "pending");
    if (pendingChores.length > 0) {
      pendingActions.push({
        text: `${pendingChores.length} tache${pendingChores.length > 1 ? "s" : ""} a faire`,
        href: "/chores",
      });
    }

    // Grocery duty action
    if (groceryDutyUserId === user.id && groceryItemCount > 0) {
      pendingActions.push({
        text: `${groceryItemCount} article${groceryItemCount > 1 ? "s" : ""} a acheter`,
        href: "/grocery",
      });
    }
  }

  // Fetch next week mini data
  if (hasNextWeek) {
    const [{ data: nextDinners }, { data: nextLunches }] = await Promise.all([
      supabase
        .from("dinner_slots")
        .select(
          "date, status, cook_id, cook:profiles!dinner_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", nextWeek!.id)
        .order("date"),
      supabase
        .from("lunch_slots")
        .select(
          "date, cook_id, cook:profiles!lunch_slots_cook_id_fkey(id, display_name, avatar_emoji, avatar_url, color)"
        )
        .eq("week_id", nextWeek!.id)
        .order("date"),
    ]);

    const nextDates = getWeekDates(nextMonday);
    const dinnerMap = new Map<string, { cook: unknown; status: string; cook_id: string | null }>();
    for (const d of nextDinners ?? []) dinnerMap.set(d.date, d);
    const lunchMap = new Map<string, { cook: unknown; cook_id: string | null }>();
    for (const l of nextLunches ?? []) lunchMap.set(l.date, l);

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

      {/* Chores checklist */}
      {hasCurrentWeek && myChores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-muted-foreground">Mes taches</p>
            <Link href="/chores" className="text-xs text-muted-foreground hover:text-foreground">
              Tout voir
            </Link>
          </div>
          <ChoreChecklist chores={myChores} />
        </div>
      )}

      {/* Meals + Grocery */}
      <div className="grid grid-cols-2 gap-3">
        {/* Lunch */}
        <Link href="/meals?tab=dejeuner" className="block">
          <div className="rounded-xl border p-3 transition-colors active:bg-muted/50 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">Dejeuner</span>
            </div>
            {!hasCurrentWeek ? (
              <p className="text-xs text-muted-foreground">Pas de semaine</p>
            ) : !todayLunch ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserAvatar src={todayLunch.cook.avatar_url} fallback={todayLunch.cook.avatar_emoji} size="sm" />
                  <span className="text-sm font-medium truncate">
                    {todayLunch.isCook ? "Toi" : todayLunch.cook.display_name.split(" ")[0]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {todayLunch.recipe_name ?? "Pas encore decide"}
                  {` · ${todayLunch.eaters.length} pers.`}
                </p>
              </div>
            )}
          </div>
        </Link>

        {/* Dinner */}
        <Link href="/meals" className="block">
          <div className="rounded-xl border p-3 transition-colors active:bg-muted/50 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-500">Souper</span>
            </div>
            {!hasCurrentWeek ? (
              <p className="text-xs text-muted-foreground">Pas de semaine</p>
            ) : !todayDinner ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : todayDinner.status === "skipped" ? (
              <p className="text-xs text-muted-foreground">Passe</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserAvatar src={todayDinner.cook.avatar_url} fallback={todayDinner.cook.avatar_emoji} size="sm" />
                  <span className="text-sm font-medium truncate">
                    {todayDinner.isCook ? "Toi" : todayDinner.cook.display_name.split(" ")[0]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {todayDinner.recipe_name ?? todayDinner.note ?? "Pas encore decide"}
                  {` · ${todayDinner.eaters.length} pers.`}
                </p>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Grocery card */}
      {hasCurrentWeek && (
        <Link href="/grocery" className="block">
          <div className="rounded-xl border p-3 transition-colors active:bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Epicerie</span>
              </div>
              <div className="flex items-center gap-2">
                {groceryUrgentCount > 0 && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full dark:bg-amber-900/30">
                    {groceryUrgentCount} urgent
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {groceryItemCount} article{groceryItemCount !== 1 ? "s" : ""}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Mini week preview */}
      {(miniWeek || nextMiniWeek) && (
        <MiniWeekPreview
          currentWeek={miniWeek}
          nextWeek={nextMiniWeek}
          todayStr={todayStr}
        />
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
