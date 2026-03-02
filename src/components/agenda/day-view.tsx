"use client";

import { Plus, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Profile } from "./agenda-view";

const CATEGORY_COLORS: Record<string, string> = {
  car: "bg-blue-500",
  family: "bg-purple-500",
  appointment: "bg-amber-500",
  other: "bg-gray-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  car: "Voiture",
  family: "Famille",
  appointment: "RDV",
  other: "Autre",
};

export function DayView({
  events,
  profileMap,
  currentDate,
  onAddEvent,
  onEditEvent,
}: {
  events: CalendarEvent[];
  profileMap: Map<string, Profile>;
  currentDate: string;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
}) {
  const dayEvents = events.filter((e) => e.date === currentDate);

  return (
    <div className="space-y-3">
      {dayEvents.length > 0 ? (
        dayEvents.map((event) => {
          const profile = profileMap.get(event.user_id);
          return (
            <button
              key={event.id}
              onClick={() => onEditEvent(event)}
              className="w-full text-left rounded-xl border p-3 transition-colors active:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-1.5 rounded-full shrink-0 self-stretch min-h-[40px]", CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.other)} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {CATEGORY_LABELS[event.category] ?? event.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.all_day
                      ? "Toute la journee"
                      : event.start_time
                        ? `${event.start_time.slice(0, 5)}${event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ""}`
                        : "Pas d'heure"}
                  </p>
                  {event.note && (
                    <p className="text-xs text-muted-foreground">{event.note}</p>
                  )}
                </div>
                {profile && (
                  <UserAvatar
                    src={profile.avatar_url}
                    fallback={profile.avatar_emoji}
                    size="sm"
                  />
                )}
              </div>
            </button>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun evenement ce jour
        </p>
      )}

      <button
        onClick={onAddEvent}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground transition-colors active:bg-muted/50"
      >
        <Plus className="h-4 w-4" />
        Ajouter un evenement
      </button>
    </div>
  );
}
