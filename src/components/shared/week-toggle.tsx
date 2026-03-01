"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => setWeek("current")}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          !isNext
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Cette semaine
      </button>
      <button
        onClick={() => setWeek("next")}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isNext
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        )}
      >
        Semaine prochaine
      </button>
    </div>
  );
}
