"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
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
    <div className="rounded-2xl bg-card shadow-sm border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        {hasToggle ? (
          <div className="flex gap-1 bg-muted/60 rounded-xl p-0.5">
            <button
              onClick={() => setShowNext(false)}
              className={cn(
                "relative text-xs px-2.5 py-1 rounded-lg transition-colors",
                !showNext ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {!showNext && (
                <motion.div
                  layoutId="mini-week-toggle"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative font-medium">Cette semaine</span>
            </button>
            <button
              onClick={() => setShowNext(true)}
              className={cn(
                "relative text-xs px-2.5 py-1 rounded-lg transition-colors",
                showNext ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {showNext && (
                <motion.div
                  layoutId="mini-week-toggle"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative font-medium">Prochaine</span>
            </button>
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {showNext ? "Semaine prochaine" : "Cette semaine"}
          </p>
        )}
        <Link href={`/week${showNext ? "?week=next" : ""}`}>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-x-1.5 items-center">
        <div />
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
          const parsed = parseISO(day.date);
          const dayLetter = format(parsed, "EEEEE", { locale: fr });
          return (
            <span
              key={day.date}
              className={cn(
                "text-[10px] uppercase text-center font-semibold",
                isToday ? "text-primary" : "text-muted-foreground"
              )}
            >
              {dayLetter}
            </span>
          );
        })}

        {/* Lunch row */}
        <span className="text-[10px] text-muted-foreground pr-2 font-medium">Dej.</span>
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
          const isPast = !showNext && day.date < todayStr;
          return (
            <div
              key={day.date + "-l"}
              className={cn(
                "flex justify-center py-1 rounded-t-lg",
                isToday && "bg-primary/8",
                isPast && "opacity-35"
              )}
            >
              {day.lunchCook ? (
                <UserAvatar
                  src={day.lunchCook.avatar_url}
                  fallback={day.lunchCook.avatar_emoji}
                  size="sm"
                  className="h-6 w-6 text-sm"
                />
              ) : (
                <span className="text-sm leading-none text-muted-foreground/40">&middot;</span>
              )}
            </div>
          );
        })}

        {/* Dinner row */}
        <span className="text-[10px] text-muted-foreground pr-2 font-medium">Souper</span>
        {week.map((day) => {
          const isToday = !showNext && day.date === todayStr;
          const isPast = !showNext && day.date < todayStr;
          const isSkipped = day.dinnerStatus === "skipped";
          return (
            <div
              key={day.date + "-d"}
              className={cn(
                "flex justify-center py-1 rounded-b-lg",
                isToday && "bg-primary/8",
                isPast && "opacity-35"
              )}
            >
              {day.dinnerCook ? (
                <UserAvatar
                  src={day.dinnerCook.avatar_url}
                  fallback={day.dinnerCook.avatar_emoji}
                  size="sm"
                  className={cn("h-6 w-6 text-sm", isSkipped && "opacity-30")}
                />
              ) : (
                <span className="text-sm leading-none text-muted-foreground/40">&middot;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
