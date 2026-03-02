"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toDateString } from "@/lib/rotation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type DayData = {
  date: string;
  dinner: {
    cookEmoji: string;
    cookAvatarUrl: string | null;
    cookName: string;
    cookColor: string;
    cookId: string;
    note: string | null;
    recipeName: string | null;
    status: string;
    eaterCount: number;
  } | null;
  lunch: {
    cookEmoji: string;
    cookAvatarUrl: string | null;
    cookName: string;
    cookColor: string;
    cookId: string;
    recipeName: string | null;
    status: string;
    eaterCount: number;
  } | null;
  chores: Array<{
    name: string;
    status: string;
    assignedTo: {
      id: string;
      display_name: string;
      color: string;
      avatar_emoji: string;
      avatar_url: string | null;
    };
  }>;
};

export function WeekGrid({
  days,
  currentUserId,
}: {
  days: DayData[];
  currentUserId: string;
}) {
  const router = useRouter();
  const todayStr = toDateString(new Date());

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const isToday = day.date === todayStr;
        const isPast = day.date < todayStr;
        const parsed = parseISO(day.date);
        const dayLabel = format(parsed, "EEE d", { locale: fr });
        const l = day.lunch;
        const d = day.dinner;

        return (
          <div
            key={day.date}
            className={cn(
              "rounded-2xl bg-card shadow-sm border border-border/50 p-3.5 transition-all",
              isToday && "ring-2 ring-primary/20 shadow-md",
              isPast && "opacity-45"
            )}
          >
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={cn(
                  "text-sm font-bold capitalize",
                  isToday ? "text-primary" : "text-foreground"
                )}
              >
                {dayLabel}
              </span>
              {isToday && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Aujourd&apos;hui
                </span>
              )}
            </div>

            {/* Meals row */}
            <div className="flex gap-2.5">
              {/* Lunch */}
              <button
                onClick={() => router.push("/lunch")}
                className="flex-1 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 min-h-[48px] transition-all active:scale-[0.97] active:bg-muted"
              >
                {l && l.status !== "skipped" ? (
                  <>
                    <UserAvatar src={l.cookAvatarUrl} fallback={l.cookEmoji} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5 font-medium">
                        Dej.
                      </p>
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: l.cookColor }}
                      >
                        {l.cookId === currentUserId
                          ? "Toi"
                          : l.cookName.split(" ")[0]}
                        {l.recipeName ? ` — ${l.recipeName}` : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {l?.status === "skipped" ? "Dej. — passe" : "Dej."}
                  </span>
                )}
              </button>

              {/* Dinner */}
              <button
                onClick={() => router.push("/dinner")}
                className="flex-1 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5 min-h-[48px] transition-all active:scale-[0.97] active:bg-muted"
              >
                {d && d.status !== "skipped" ? (
                  <>
                    <UserAvatar src={d.cookAvatarUrl} fallback={d.cookEmoji} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5 font-medium">
                        Souper
                      </p>
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: d.cookColor }}
                      >
                        {d.cookId === currentUserId
                          ? "Toi"
                          : d.cookName.split(" ")[0]}
                        {d.recipeName ? ` — ${d.recipeName}` : d.note ? ` — ${d.note}` : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {d?.status === "skipped" ? "Souper — passe" : "Souper"}
                  </span>
                )}
              </button>
            </div>

            {/* Chores for this day */}
            {day.chores.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {day.chores.map((chore) => {
                  const isDone = chore.status === "done";
                  const isMine = chore.assignedTo.id === currentUserId;

                  return (
                    <button
                      key={chore.name}
                      onClick={() => router.push("/chores")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all active:scale-[0.95] border min-h-[32px]",
                        isDone ? "bg-muted/30 text-muted-foreground" : "bg-card"
                      )}
                      style={{ borderColor: chore.assignedTo.color + "30" }}
                    >
                      <UserAvatar src={chore.assignedTo.avatar_url} fallback={chore.assignedTo.avatar_emoji} size="sm" className="h-4 w-4 text-xs" />
                      <span className={cn("capitalize font-medium", isDone && "line-through")}>
                        {chore.name}
                      </span>
                      {isDone && <span className="text-emerald-600">✓</span>}
                      {isMine && !isDone && (
                        <span className="text-muted-foreground">(toi)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
