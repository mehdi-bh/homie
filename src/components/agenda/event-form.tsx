"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { CalendarEvent } from "./agenda-view";

const CATEGORIES = [
  { value: "car", label: "Voiture" },
  { value: "family", label: "Famille" },
  { value: "appointment", label: "RDV" },
  { value: "other", label: "Autre" },
] as const;

const CAR_PRESETS = [
  { label: "Journee", start: "08:00", end: "20:00", allDay: true },
  { label: "Matin", start: "08:00", end: "12:00", allDay: false },
  { label: "Apres-midi", start: "13:00", end: "18:00", allDay: false },
  { label: "Soir", start: "18:00", end: "22:00", allDay: false },
] as const;

export function EventForm({
  open,
  onOpenChange,
  event,
  defaultDate,
  currentUserId,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaultDate: string;
  currentUserId: string;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (event) {
        setTitle(event.title);
        setCategory(event.category);
        setDate(event.date);
        setStartTime(event.start_time?.slice(0, 5) ?? "");
        setEndTime(event.end_time?.slice(0, 5) ?? "");
        setAllDay(event.all_day);
        setNote(event.note ?? "");
      } else {
        setTitle("");
        setCategory("other");
        setDate(defaultDate);
        setStartTime("");
        setEndTime("");
        setAllDay(false);
        setNote("");
      }
    }
  }, [open, event, defaultDate]);

  function applyCarPreset(preset: (typeof CAR_PRESETS)[number]) {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setAllDay(preset.allDay);
    if (!title) setTitle("Voiture");
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: title.trim(),
      category,
      date,
      start_time: allDay ? null : startTime || null,
      end_time: allDay ? null : endTime || null,
      all_day: allDay,
      note: note.trim() || null,
      user_id: currentUserId,
    };

    if (event) {
      const { data } = await supabase
        .from("calendar_events")
        .update(payload)
        .eq("id", event.id)
        .select("id, user_id, title, date, start_time, end_time, all_day, category, note, created_at")
        .single();
      if (data) onSaved(data as CalendarEvent);
    } else {
      const { data } = await supabase
        .from("calendar_events")
        .insert(payload)
        .select("id, user_id, title, date, start_time, end_time, all_day, category, note, created_at")
        .single();
      if (data) onSaved(data as CalendarEvent);
    }
    setSaving(false);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!event) return;
    const supabase = createClient();
    await supabase.from("calendar_events").delete().eq("id", event.id);
    onDeleted(event.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{event ? "Modifier" : "Nouvel evenement"}</SheetTitle>
          <SheetDescription className="sr-only">
            {event ? "Modifier un evenement" : "Creer un nouvel evenement"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
            autoFocus
          />

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "text-xs px-3 py-2 rounded-xl transition-all active:scale-95 min-h-[36px] font-medium",
                  category === cat.value
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground bg-muted/50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Car presets */}
          {category === "car" && (
            <div className="flex gap-2 flex-wrap">
              {CAR_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyCarPreset(preset)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground font-medium transition-all active:scale-95 active:bg-muted/50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
          />

          {/* All day toggle */}
          <label className="flex items-center gap-3 text-sm font-medium px-1 min-h-[40px]">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded h-4 w-4"
            />
            Toute la journee
          </label>

          {/* Time inputs */}
          {!allDay && (
            <div className="flex gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Debut"
                className="flex-1 rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Fin"
                className="flex-1 rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
              />
            </div>
          )}

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel)"
            rows={2}
            className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none shadow-sm"
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={save}
              disabled={!title.trim() || saving}
              className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] min-h-[52px] shadow-sm"
            >
              {saving ? "..." : event ? "Enregistrer" : "Ajouter"}
            </button>
            {event && (
              <button
                onClick={handleDelete}
                className="rounded-2xl border border-destructive/30 text-destructive px-5 py-3.5 text-sm font-semibold transition-all active:scale-[0.98] active:bg-destructive/10 min-h-[52px]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
