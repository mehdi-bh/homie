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
      <div key={event.id} className="flex items-center gap-2.5 py-1">
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            CATEGORY_DOT_COLORS[event.category] ?? CATEGORY_DOT_COLORS.other
          )}
        />
        <span className="text-xs text-muted-foreground shrink-0 w-11">
          {event.all_day
            ? "Journee"
            : event.start_time
              ? event.start_time.slice(0, 5)
              : ""}
        </span>
        <span className="text-sm truncate font-medium">{event.title}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-sm border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agenda</p>
        <Link href="/agenda" className="flex items-center gap-1 text-xs text-primary font-medium">
          Tout voir
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {hasEvents ? (
        <div className="space-y-3">
          {todayEvents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Aujourd&apos;hui</p>
              {todayEvents.map(renderEvent)}
            </div>
          )}
          {tomorrowEvents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Demain</p>
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
