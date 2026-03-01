"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type ProfileInfo = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
  color: string;
};

type MiniDay = {
  date: string;
  dinnerCook: ProfileInfo | null;
  dinnerStatus: string | null;
  lunchCook: ProfileInfo | null;
};

export function MiniWeekPreview({
  currentWeek,
  nextWeek,
  todayStr,
}: {
  currentWeek: MiniDay[] | null;
  nextWeek: MiniDay[] | null;
  todayStr: string;
}) {
  const [showNext, setShowNext] = useState(false);
  const week = showNext ? nextWeek : currentWeek;
  const hasToggle = currentWeek && nextWeek;

  if (!week || week.length === 0) return null;

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2.5">
        {hasToggle ? (
          <div className="flex gap-1">
            <button
              onClick={() => setShowNext(false)}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full transition-colors",
                !showNext
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground"
              )}
            >
              Cette semaine
            </button>
            <button
              onClick={() => setShowNext(true)}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full transition-colors",
                showNext
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground"
              )}
            >
              Prochaine
            </button>
          </div>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">
            {showNext ? "Semaine prochaine" : "Cette semaine"}
          </p>
        )}
        <Link href={`/week${showNext ? "?week=next" : ""}`}>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>

      <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-x-1 items-center">
        <div />
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
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
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
          const isPast = !showNext && day.date < todayStr;
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
                <UserAvatar
                  src={day.lunchCook.avatar_url}
                  fallback={day.lunchCook.avatar_emoji}
                  size="sm"
                  className="h-5 w-5 text-sm"
                />
              ) : (
                <span className="text-sm leading-none">&middot;</span>
              )}
            </div>
          );
        })}

        {/* Dinner row */}
        <span className="text-[10px] text-muted-foreground pr-1.5">Souper</span>
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
          const isPast = !showNext && day.date < todayStr;
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
                <UserAvatar
                  src={day.dinnerCook.avatar_url}
                  fallback={day.dinnerCook.avatar_emoji}
                  size="sm"
                  className={cn("h-5 w-5 text-sm", isSkipped && "opacity-30")}
                />
              ) : (
                <span className="text-sm leading-none">&middot;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
