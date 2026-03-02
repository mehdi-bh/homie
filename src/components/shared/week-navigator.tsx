"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO, addWeeks, subWeeks, addDays, startOfWeek, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { getWeekMonday, toDateString } from "@/lib/rotation";

export function WeekNavigator({
  currentDate,
  generated,
  basePath,
}: {
  currentDate: string;
  generated: boolean;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const parsed = parseISO(currentDate);
  const monday = startOfWeek(parsed, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const todayMonday = getWeekMonday();
  const isCurrentWeek = toDateString(monday) === toDateString(todayMonday);
  const isPast = isBefore(monday, todayMonday) && !isCurrentWeek;

  const dateLabel = `${format(monday, "d MMM", { locale: fr })} - ${format(sunday, "d MMM yyyy", { locale: fr })}`;

  function navigate(direction: "prev" | "next") {
    const newDate = direction === "next" ? addWeeks(monday, 1) : subWeeks(monday, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", toDateString(newDate));
    router.push(`${basePath}?${params.toString()}`);
  }

  async function handleGenerate(force = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/weeks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_date: toDateString(monday), force }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("prev")}
          className="h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-90 active:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className={`text-sm font-semibold capitalize ${isPast ? "text-muted-foreground" : ""}`}>
            {dateLabel}
          </span>
          {isCurrentWeek && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Cette semaine
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("next")}
          className="h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-90 active:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isPast ? null : !generated ? (
        <button
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/4 px-4 py-4 text-sm font-semibold text-primary transition-all active:scale-[0.98] disabled:opacity-50 min-h-[52px]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generer cette semaine"}
        </button>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors active:text-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Regenerer
          </button>
        </div>
      )}
    </div>
  );
}
