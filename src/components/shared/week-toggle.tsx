"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function WeekToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNext = searchParams.get("week") === "next";

  function setWeek(week: "current" | "next") {
    const params = new URLSearchParams(searchParams.toString());
    if (week === "next") {
      params.set("week", "next");
    } else {
      params.delete("week");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-2xl bg-muted/60 p-1">
      <button
        onClick={() => setWeek("current")}
        className={cn(
          "relative rounded-xl px-4 py-2 text-sm font-medium transition-colors flex-1 min-h-[40px]",
          !isNext ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {!isNext && (
          <motion.div
            layoutId="week-toggle"
            className="absolute inset-0 bg-card rounded-xl shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative">Cette semaine</span>
      </button>
      <button
        onClick={() => setWeek("next")}
        className={cn(
          "relative rounded-xl px-4 py-2 text-sm font-medium transition-colors flex-1 min-h-[40px]",
          isNext ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {isNext && (
          <motion.div
            layoutId="week-toggle"
            className="absolute inset-0 bg-card rounded-xl shadow-sm"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative">Semaine prochaine</span>
      </button>
    </div>
  );
}
