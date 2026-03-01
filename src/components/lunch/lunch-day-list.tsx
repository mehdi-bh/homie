"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateString } from "@/lib/rotation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

export type Profile = {
  id: string;
  display_name: string;
  color: string;
  avatar_emoji: string;
  avatar_url: string | null;
  default_lunch: string | null;
};

type LunchPreference = {
  id: string;
  lunch_slot_id: string;
  user_id: string;
  preference: string | null;
  eating: boolean;
  note: string | null;
};

export type LunchSlot = {
  id: string;
  date: string;
  status: "pending" | "confirmed" | "skipped";
  note: string | null;
  cook_id: string;
  cook: {
    id: string;
    display_name: string;
    color: string;
    avatar_emoji: string;
    avatar_url: string | null;
  };
  preferences: LunchPreference[];
};

export function LunchDayList({
  slots: initialSlots,
  profiles,
  currentUserId,
}: {
  slots: LunchSlot[];
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

  async function upsertPreference(
    slotId: string,
    preference: string | null,
    eating: boolean
  ) {
    // Optimistic update
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const existingPref = s.preferences.find(
          (p) => p.user_id === currentUserId
        );
        const updatedPref = existingPref
          ? { ...existingPref, preference, eating }
          : {
              id: `temp-${Date.now()}`,
              lunch_slot_id: slotId,
              user_id: currentUserId,
              preference,
              eating,
              note: null,
            };
        return {
          ...s,
          preferences: existingPref
            ? s.preferences.map((p) =>
                p.user_id === currentUserId ? updatedPref : p
              )
            : [...s.preferences, updatedPref],
        };
      })
    );
    setEditing(null);

    const supabase = createClient();
    await supabase.from("lunch_preferences").upsert(
      {
        lunch_slot_id: slotId,
        user_id: currentUserId,
        preference,
        eating,
      },
      { onConflict: "lunch_slot_id,user_id" }
    );
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
        const dayLabel = format(parseISO(slot.date), "EEEE d", { locale: fr });
        const isCook = slot.cook_id === currentUserId;

        return (
          <div
            key={slot.id}
            className={cn(
              "rounded-xl border p-4",
              isToday && "ring-2 ring-primary/20",
              isPast && "opacity-50"
            )}
            style={{ borderLeftWidth: 4, borderLeftColor: slot.cook.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium capitalize text-sm">{dayLabel}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserAvatar src={slot.cook.avatar_url} fallback={slot.cook.avatar_emoji} size="sm" />
                  {slot.cook.display_name} cuisine
                  {isCook && <span className="opacity-60"> (toi)</span>}
                </p>
              </div>
              {isToday && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Aujourd&apos;hui
                </span>
              )}
            </div>

            <div className="space-y-1">
              {profiles.map((profile) => {
                const pref = slot.preferences.find(
                  (p) => p.user_id === profile.id
                );
                const eating = pref?.eating ?? true;
                const prefText =
                  pref?.preference ?? profile.default_lunch ?? "";
                const isMe = profile.id === currentUserId;
                const editKey = `${slot.id}-${profile.id}`;
                const isEditing = editing === editKey;

                return (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 min-h-[40px]",
                      !eating && "opacity-35",
                      isMe && eating && !isPast && "bg-muted/50"
                    )}
                  >
                    <UserAvatar src={profile.avatar_url} fallback={profile.avatar_emoji} size="sm" />

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          autoFocus
                          className="w-full bg-transparent text-sm outline-none border-b border-primary pb-0.5"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => {
                            if (!escapedRef.current) {
                              upsertPreference(
                                slot.id,
                                editValue.trim() || null,
                                eating
                              );
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
                          placeholder={
                            profile.default_lunch || "Preference..."
                          }
                        />
                      ) : (
                        <p
                          className={cn(
                            "text-sm truncate",
                            !eating && "line-through",
                            isMe && eating && !isPast && "cursor-text"
                          )}
                          onClick={() => {
                            if (isMe && eating && !isPast) {
                              setEditing(editKey);
                              setEditValue(pref?.preference ?? "");
                            }
                          }}
                        >
                          {eating ? (
                            prefText || (
                              <span className="text-muted-foreground italic">
                                {isMe ? "Ajouter..." : "—"}
                              </span>
                            )
                          ) : (
                            "Pas la"
                          )}
                        </p>
                      )}
                    </div>

                    {isMe && !isPast && (
                      <button
                        onClick={() =>
                          upsertPreference(
                            slot.id,
                            pref?.preference ?? null,
                            !eating
                          )
                        }
                        className={cn(
                          "shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors active:scale-95",
                          eating
                            ? "bg-green-500/15 text-green-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {eating ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
