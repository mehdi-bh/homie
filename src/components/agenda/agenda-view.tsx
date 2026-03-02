"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toDateString } from "@/lib/rotation";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { EventForm } from "./event-form";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  category: string;
  note: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
  color: string;
};

type ViewMode = "day" | "week" | "month";

export function AgendaView({
  events: initialEvents,
  profiles,
  currentUserId,
  initialView,
  initialDate,
}: {
  events: CalendarEvent[];
  profiles: Profile[];
  currentUserId: string;
  initialView: ViewMode;
  initialDate: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>(initialView);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [events, setEvents] = useState(initialEvents);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formDate, setFormDate] = useState<string | null>(null);

  const eventsRef = useRef(initialEvents);
  if (initialEvents !== eventsRef.current) {
    eventsRef.current = initialEvents;
    setEvents(initialEvents);
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  function navigate(direction: "prev" | "next") {
    const date = parseISO(currentDate);
    let newDate: Date;
    if (view === "day") {
      newDate = direction === "next" ? addDays(date, 1) : subDays(date, 1);
    } else if (view === "week") {
      newDate = direction === "next" ? addWeeks(date, 1) : subWeeks(date, 1);
    } else {
      newDate = direction === "next" ? addMonths(date, 1) : subMonths(date, 1);
    }
    const newDateStr = toDateString(newDate);
    setCurrentDate(newDateStr);
    router.push(`/agenda?view=${view}&date=${newDateStr}`);
  }

  function changeView(newView: ViewMode) {
    setView(newView);
    router.push(`/agenda?view=${newView}&date=${currentDate}`);
  }

  function goToDay(dateStr: string) {
    setCurrentDate(dateStr);
    setView("day");
    router.push(`/agenda?view=day&date=${dateStr}`);
  }

  function openForm(date?: string, event?: CalendarEvent) {
    setFormDate(date ?? currentDate);
    setEditingEvent(event ?? null);
    setFormOpen(true);
  }

  function handleEventSaved(event: CalendarEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        return prev.map((e) => (e.id === event.id ? event : e));
      }
      return [...prev, event];
    });
  }

  function handleEventDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const parsed = parseISO(currentDate);
  let dateLabel: string;
  if (view === "day") {
    dateLabel = format(parsed, "EEEE d MMMM", { locale: fr });
  } else if (view === "week") {
    const monday = startOfWeek(parsed, { weekStartsOn: 1 });
    const sunday = addDays(monday, 6);
    dateLabel = `${format(monday, "d MMM", { locale: fr })} - ${format(sunday, "d MMM yyyy", { locale: fr })}`;
  } else {
    dateLabel = format(parsed, "MMMM yyyy", { locale: fr });
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-1">
        {(["day", "week", "month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => changeView(v)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-colors",
              view === v
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground"
            )}
          >
            {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("prev")}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors active:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium capitalize">{dateLabel}</span>
        <button
          onClick={() => navigate("next")}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors active:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* View content */}
      {view === "week" && (
        <WeekView
          events={events}
          profileMap={profileMap}
          currentDate={currentDate}
          onAddEvent={(date) => openForm(date)}
          onEditEvent={(event) => openForm(event.date, event)}
        />
      )}
      {view === "day" && (
        <DayView
          events={events}
          profileMap={profileMap}
          currentDate={currentDate}
          onAddEvent={() => openForm(currentDate)}
          onEditEvent={(event) => openForm(event.date, event)}
        />
      )}
      {view === "month" && (
        <MonthView
          events={events}
          currentDate={currentDate}
          onDayClick={goToDay}
        />
      )}

      {/* Event form */}
      <EventForm
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        defaultDate={formDate ?? currentDate}
        currentUserId={currentUserId}
        onSaved={handleEventSaved}
        onDeleted={handleEventDeleted}
      />
    </div>
  );
}
