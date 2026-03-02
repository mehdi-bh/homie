import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  all_day: boolean;
  category: string;
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  car: "bg-blue-500",
  family: "bg-purple-500",
  appointment: "bg-amber-500",
  other: "bg-gray-400",
};

export function CalendarWidget({
  todayEvents,
  tomorrowEvents,
}: {
  todayEvents: CalendarEvent[];
  tomorrowEvents: CalendarEvent[];
}) {
  const hasEvents = todayEvents.length > 0 || tomorrowEvents.length > 0;

  function renderEvent(event: CalendarEvent) {
    return (
      <div key={event.id} className="flex items-center gap-2 py-0.5">
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            CATEGORY_DOT_COLORS[event.category] ?? CATEGORY_DOT_COLORS.other
          )}
        />
        <span className="text-xs text-muted-foreground shrink-0">
          {event.all_day
            ? "Journee"
            : event.start_time
              ? event.start_time.slice(0, 5)
              : ""}
        </span>
        <span className="text-sm truncate">{event.title}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Agenda</p>
        <Link href="/agenda" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Tout voir
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {hasEvents ? (
        <div className="space-y-2">
          {todayEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Aujourd&apos;hui</p>
              {todayEvents.map(renderEvent)}
            </div>
          )}
          {tomorrowEvents.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Demain</p>
              {tomorrowEvents.map(renderEvent)}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun evenement</p>
      )}
    </div>
  );
}
