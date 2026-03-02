"use client";

import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { toDateString } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./agenda-view";

const CATEGORY_DOT_COLORS: Record<string, string> = {
  car: "bg-blue-500",
  family: "bg-purple-500",
  appointment: "bg-amber-500",
  other: "bg-gray-400",
};

const DAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthView({
  events,
  currentDate,
  onDayClick,
}: {
  events: CalendarEvent[];
  currentDate: string;
  onDayClick: (date: string) => void;
}) {
  const todayStr = toDateString(new Date());
  const baseDate = parseISO(currentDate);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build day cells
  const days: Date[] = [];
  let current = calStart;
  while (current <= calEnd) {
    days.push(current);
    current = addDays(current, 1);
  }

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) ?? [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm border border-border/50 p-3">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_HEADERS.map((d, i) => (
          <span key={i} className="text-[10px] text-center text-muted-foreground font-semibold uppercase">
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = toDateString(day);
          const isToday = dateStr === todayStr;
          const inMonth = isSameMonth(day, baseDate);
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const categories = [...new Set(dayEvents.map((e) => e.category))];

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={cn(
                "flex flex-col items-center justify-start rounded-xl py-2 min-h-[48px] transition-all active:scale-95 active:bg-muted/50",
                !inMonth && "opacity-25"
              )}
            >
              <span
                className={cn(
                  "text-xs leading-none font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center font-semibold"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {categories.length > 0 && (
                <div className="flex gap-0.5 mt-1.5">
                  {categories.slice(0, 3).map((cat) => (
                    <div
                      key={cat}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        CATEGORY_DOT_COLORS[cat] ?? CATEGORY_DOT_COLORS.other
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
