"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toDateString } from "@/lib/rotation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  display_name: string;
  color: string;
  avatar_emoji: string;
  avatar_url: string | null;
};

export type DinnerSlot = {
  id: string;
  date: string;
  status: "pending" | "confirmed" | "skipped";
  note: string | null;
  eaters: string[];
  cook_id: string;
  cook: Profile;
};

export function DinnerSlotList({
  slots: initialSlots,
  profiles,
  currentUserId,
}: {
  slots: DinnerSlot[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const escapedRef = useRef(false);

  // Sync with server data when props change (realtime refresh)
  const slotsRef = useRef(initialSlots);
  if (initialSlots !== slotsRef.current) {
    slotsRef.current = initialSlots;
    setSlots(initialSlots);
  }

  const todayStr = toDateString(new Date());

  async function updateNote(slotId: string, note: string | null) {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, note } : s))
    );
    setEditing(null);
    const supabase = createClient();
    await supabase
      .from("dinner_slots")
      .update({ note })
      .eq("id", slotId);
  }

  async function toggleEater(
    slotId: string,
    currentEaters: string[],
    userId: string
  ) {
    const newEaters = currentEaters.includes(userId)
      ? currentEaters.filter((id) => id !== userId)
      : [...currentEaters, userId];
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, eaters: newEaters } : s))
    );
    const supabase = createClient();
    await supabase
      .from("dinner_slots")
      .update({ eaters: newEaters })
      .eq("id", slotId);
  }

  async function toggleSkip(slotId: string, currentStatus: string) {
    const newStatus = currentStatus === "skipped" ? "pending" : "skipped";
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, status: newStatus as DinnerSlot["status"] } : s
      )
    );
    const supabase = createClient();
    await supabase
      .from("dinner_slots")
      .update({ status: newStatus })
      .eq("id", slotId);
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Pas de semaine generee.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {slots.map((slot) => {
        const isToday = slot.date === todayStr;
        const isPast = slot.date < todayStr;
        const isSkipped = slot.status === "skipped";
        const isCook = slot.cook_id === currentUserId;
        const dayLabel = format(parseISO(slot.date), "EEEE d", { locale: fr });

        return (
          <div
            key={slot.id}
            className={cn(
              "rounded-xl border p-4",
              isToday && "ring-2 ring-primary/20",
              isPast && "opacity-50",
              isSkipped && "opacity-40"
            )}
            style={{
              borderLeftWidth: 4,
              borderLeftColor: isSkipped ? "#9ca3af" : slot.cook.color,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium capitalize text-sm">{dayLabel}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserAvatar src={slot.cook.avatar_url} fallback={slot.cook.avatar_emoji} size="sm" />
                  {slot.cook.display_name}
                  {isCook && <span className="opacity-60"> (toi)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isToday && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Aujourd&apos;hui
                  </span>
                )}
                {isSkipped && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Passe
                  </span>
                )}
              </div>
            </div>

            {!isSkipped && (
              <>
                {/* Meal name */}
                <div className="mb-3">
                  {editing === slot.id ? (
                    <input
                      autoFocus
                      className="w-full bg-transparent text-sm outline-none border-b border-primary pb-0.5"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (!escapedRef.current) {
                          updateNote(slot.id, editValue.trim() || null);
                        }
                        escapedRef.current = false;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") {
                          escapedRef.current = true;
                          setEditing(null);
                        }
                      }}
                      placeholder="Qu'est-ce qu'on mange ?"
                    />
                  ) : (
                    <p
                      className={cn(
                        "text-sm",
                        slot.note
                          ? "text-foreground"
                          : "text-muted-foreground italic",
                        isCook && !isPast && "cursor-text"
                      )}
                      onClick={() => {
                        if (isCook && !isPast) {
                          setEditing(slot.id);
                          setEditValue(slot.note || "");
                        }
                      }}
                    >
                      {slot.note ||
                        (isCook && !isPast
                          ? "Ajouter un repas..."
                          : "Pas encore decide")}
                    </p>
                  )}
                </div>

                {/* Eaters */}
                <div className="flex items-center gap-1">
                  {profiles.map((profile) => {
                    const isEating = slot.eaters.includes(profile.id);
                    return (
                      <button
                        key={profile.id}
                        onClick={() =>
                          !isPast &&
                          toggleEater(slot.id, slot.eaters, profile.id)
                        }
                        disabled={isPast}
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-sm transition-all border-2 active:scale-95",
                          isEating
                            ? "opacity-100"
                            : "border-transparent opacity-25"
                        )}
                        style={{
                          borderColor: isEating ? profile.color : "transparent",
                        }}
                        title={`${profile.display_name} ${isEating ? "mange" : "ne mange pas"}`}
                      >
                        <UserAvatar src={profile.avatar_url} fallback={profile.avatar_emoji} size="sm" />
                      </button>
                    );
                  })}
                  <span className="text-xs text-muted-foreground ml-1">
                    {slot.eaters.length} pers.
                  </span>
                </div>
              </>
            )}

            {/* Skip toggle */}
            {!isPast && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => toggleSkip(slot.id, slot.status)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                >
                  {isSkipped ? "Retablir" : "Passer"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
