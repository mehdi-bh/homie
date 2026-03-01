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
    status: string;
    eaterCount: number;
  } | null;
  lunch: {
    cookEmoji: string;
    cookAvatarUrl: string | null;
    cookName: string;
    cookColor: string;
    cookId: string;
    status: string;
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
    <div className="space-y-2">
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
              "rounded-xl border p-3 transition-colors",
              isToday && "ring-2 ring-primary/20 bg-primary/[0.02]",
              isPast && "opacity-50"
            )}
          >
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "text-sm font-semibold capitalize",
                  isToday ? "text-primary" : "text-foreground"
                )}
              >
                {dayLabel}
              </span>
              {isToday && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Aujourd&apos;hui
                </span>
              )}
            </div>

            {/* Meals row */}
            <div className="flex gap-3">
              {/* Lunch */}
              <button
                onClick={() => router.push("/lunch")}
                className="flex-1 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 min-h-[40px] transition-colors active:bg-muted"
              >
                {l && l.status !== "skipped" ? (
                  <>
                    <UserAvatar src={l.cookAvatarUrl} fallback={l.cookEmoji} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                        Dej.
                      </p>
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: l.cookColor }}
                      >
                        {l.cookId === currentUserId
                          ? "Toi"
                          : l.cookName.split(" ")[0]}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {l?.status === "skipped" ? "Dej. — passe" : "Dej."}
                  </span>
                )}
              </button>

              {/* Dinner */}
              <button
                onClick={() => router.push("/dinner")}
                className="flex-1 flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-2 min-h-[40px] transition-colors active:bg-muted"
              >
                {d && d.status !== "skipped" ? (
                  <>
                    <UserAvatar src={d.cookAvatarUrl} fallback={d.cookEmoji} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] text-muted-foreground leading-none mb-0.5">
                        Diner
                      </p>
                      <p
                        className="text-xs font-medium truncate"
                        style={{ color: d.cookColor }}
                      >
                        {d.cookId === currentUserId
                          ? "Toi"
                          : d.cookName.split(" ")[0]}
                        {d.note ? ` — ${d.note}` : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {d?.status === "skipped" ? "Diner — passe" : "Diner"}
                  </span>
                )}
              </button>
            </div>

            {/* Chores for this day (inline) */}
            {day.chores.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {day.chores.map((chore) => {
                  const isDone = chore.status === "done";
                  const isMine = chore.assignedTo.id === currentUserId;

                  return (
                    <button
                      key={chore.name}
                      onClick={() => router.push("/chores")}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors active:bg-muted border",
                        isDone ? "bg-muted/30 text-muted-foreground" : "bg-background"
                      )}
                      style={{ borderColor: chore.assignedTo.color + "40" }}
                    >
                      <UserAvatar src={chore.assignedTo.avatar_url} fallback={chore.assignedTo.avatar_emoji} size="sm" className="h-4 w-4 text-xs" />
                      <span className={cn("capitalize", isDone && "line-through")}>
                        {chore.name}
                      </span>
                      {isDone && <span className="text-green-600">✓</span>}
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
