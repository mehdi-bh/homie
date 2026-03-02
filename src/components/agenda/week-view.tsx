"use client";

import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { toDateString } from "@/lib/rotation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Profile } from "./agenda-view";

const CATEGORY_COLORS: Record<string, string> = {
  car: "bg-blue-500",
  family: "bg-purple-500",
  appointment: "bg-amber-500",
  other: "bg-gray-400",
};

export function WeekView({
  events,
  profileMap,
  currentDate,
  onAddEvent,
  onEditEvent,
}: {
  events: CalendarEvent[];
  profileMap: Map<string, Profile>;
  currentDate: string;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}) {
  const todayStr = toDateString(new Date());
  const monday = startOfWeek(parseISO(currentDate), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dateStr = toDateString(day);
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const dayEvents = eventsByDate.get(dateStr) ?? [];
        const dayLabel = format(day, "EEE d", { locale: fr });

        return (
          <div
            key={dateStr}
            className={cn(
              "rounded-2xl bg-card shadow-sm border border-border/50 p-3.5 transition-all",
              isToday && "ring-2 ring-primary/20 bg-primary/[0.03]",
              isPast && "opacity-50"
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={cn(
                  "text-sm font-semibold capitalize",
                  isToday ? "text-primary" : "text-foreground"
                )}
              >
                {dayLabel}
              </span>
              <button
                onClick={() => onAddEvent(dateStr)}
                className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground transition-all active:scale-90 active:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {dayEvents.length > 0 ? (
              <div className="space-y-1">
                {dayEvents.map((event) => {
                  const profile = profileMap.get(event.user_id);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEditEvent(event)}
                      className="flex items-center gap-2 w-full text-left rounded-xl px-2.5 py-2 transition-all active:scale-[0.98] active:bg-muted/50 min-h-[40px]"
                    >
                      <div className={cn("w-1 h-6 rounded-full shrink-0", CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {event.all_day
                            ? "Journee"
                            : event.start_time
                              ? `${event.start_time.slice(0, 5)}${event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""}`
                              : ""}
                        </p>
                      </div>
                      {profile && (
                        <UserAvatar
                          src={profile.avatar_url}
                          fallback={profile.avatar_emoji}
                          size="sm"
                          className="h-5 w-5 text-xs"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
