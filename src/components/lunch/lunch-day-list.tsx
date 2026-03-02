"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ShoppingCart,
  Check,
  Undo2,
  UtensilsCrossed,
  X,
  MessageSquareText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateString } from "@/lib/rotation";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RecipePickerSheet } from "@/components/shared/recipe-picker-sheet";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  display_name: string;
  color: string;
  avatar_emoji: string;
  avatar_url: string | null;
};

export type LunchSlot = {
  id: string;
  date: string;
  status: "pending" | "confirmed" | "skipped";
  note: string | null;
  eaters: string[];
  cook_id: string;
  cook: Profile;
  recipe_id: string | null;
  recipe_name: string | null;
  ingredients_pushed: boolean;
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
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [pushing, setPushing] = useState<string | null>(null);
  const escapedRef = useRef(false);

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
    await supabase.from("lunch_slots").update({ note }).eq("id", slotId);
  }

  async function selectRecipe(
    slotId: string,
    recipe: { id: string; name: string }
  ) {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, recipe_id: recipe.id, recipe_name: recipe.name, ingredients_pushed: false }
          : s
      )
    );
    const supabase = createClient();
    await supabase
      .from("lunch_slots")
      .update({ recipe_id: recipe.id, ingredients_pushed: false })
      .eq("id", slotId);
  }

  async function clearRecipe(slotId: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, recipe_id: null, recipe_name: null, ingredients_pushed: false }
          : s
      )
    );
    const supabase = createClient();
    await supabase
      .from("lunch_slots")
      .update({ recipe_id: null, ingredients_pushed: false })
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
      .from("lunch_slots")
      .update({ eaters: newEaters })
      .eq("id", slotId);
  }

  async function toggleSkip(slotId: string, currentStatus: string) {
    const newStatus = currentStatus === "skipped" ? "pending" : "skipped";
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: newStatus as LunchSlot["status"] }
          : s
      )
    );
    const supabase = createClient();
    await supabase
      .from("lunch_slots")
      .update({ status: newStatus })
      .eq("id", slotId);
  }

  async function pushToGrocery(slotId: string) {
    setPushing(slotId);
    try {
      const res = await fetch("/api/grocery/push-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, slotType: "lunch" }),
      });
      if (res.ok) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, ingredients_pushed: true } : s
          )
        );
      }
    } finally {
      setPushing(null);
    }
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Pas de semaine generee.
      </p>
    );
  }

  return (
    <>
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
                "rounded-2xl border p-4 transition-all",
                slot.recipe_name
                  ? "bg-card shadow-sm border-border/50"
                  : "bg-card/60 border-dashed border-border/30",
                isToday && "ring-2 ring-primary/20 shadow-md",
                isPast && "opacity-45",
                isSkipped && "opacity-30 !border-solid !border-border/30 bg-muted/30"
              )}
              style={{
                borderLeftWidth: 4,
                borderLeftStyle: "solid",
                borderLeftColor: isSkipped ? "#9ca3af" : slot.cook.color,
              }}
            >
              {/* Header: Cook avatar + Day + today badge ... skip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    src={slot.cook.avatar_url}
                    fallback={slot.cook.avatar_emoji}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold capitalize text-[15px] leading-tight">{dayLabel}</p>
                      {isToday && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                          Aujourd&apos;hui
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {slot.cook.display_name}
                      {isCook && " (toi)"}
                    </p>
                  </div>
                </div>
                {!isPast && (
                  <button
                    onClick={() => toggleSkip(slot.id, slot.status)}
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all active:scale-95",
                      isSkipped
                        ? "text-primary bg-primary/8"
                        : "text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {isSkipped ? (
                      <>
                        <Undo2 className="h-3 w-3" />
                        Undo
                      </>
                    ) : (
                      <span className="text-xs">Skip</span>
                    )}
                  </button>
                )}
              </div>

              {!isSkipped && (
                <>
                  {/* Recipe */}
                  <div className="mt-3">
                    {slot.recipe_name ? (
                      <div
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl bg-primary/6 px-3 py-2.5",
                          isCook && !isPast && "cursor-pointer active:scale-[0.98] active:bg-primary/10 transition-all"
                        )}
                        onClick={() => {
                          if (isCook && !isPast) setPickerSlotId(slot.id);
                        }}
                      >
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-foreground flex-1 min-w-0 truncate">
                          {slot.recipe_name}
                        </span>
                        {isCook && !isPast && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearRecipe(slot.id);
                            }}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isCook && !isPast) setPickerSlotId(slot.id);
                        }}
                        disabled={!isCook || isPast}
                        className={cn(
                          "w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 transition-all",
                          isCook && !isPast
                            ? "border-primary/25 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                            : "border-border/30 text-muted-foreground/40"
                        )}
                      >
                        <UtensilsCrossed className="h-4 w-4" />
                        <span className="text-sm">
                          {isCook && !isPast
                            ? "Choisir une recette"
                            : "Pas encore decide"}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Note + Eaters row */}
                  <div className="flex items-center justify-between mt-3 gap-2">
                    {/* Note */}
                    <div className="min-w-0 flex-1">
                      {editing === slot.id ? (
                        <div className="flex items-center gap-1.5">
                          <MessageSquareText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <input
                            autoFocus
                            className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b-2 border-primary pb-0.5 text-foreground"
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
                            placeholder="Note..."
                          />
                        </div>
                      ) : (
                        <button
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors min-w-0",
                            slot.note
                              ? "text-muted-foreground"
                              : "text-muted-foreground/30",
                            !isPast && "hover:bg-muted/30 active:bg-muted/50 cursor-text"
                          )}
                          onClick={() => {
                            if (!isPast) {
                              setEditing(slot.id);
                              setEditValue(slot.note || "");
                            }
                          }}
                          disabled={isPast}
                        >
                          <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
                          {slot.note && (
                            <span className="text-xs truncate">{slot.note}</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Eaters */}
                    <div className="flex items-center gap-1 shrink-0">
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
                              "h-8 w-8 rounded-full flex items-center justify-center transition-all border-2 active:scale-90",
                              isEating
                                ? "opacity-100"
                                : "border-transparent opacity-20"
                            )}
                            style={{
                              borderColor: isEating ? profile.color : "transparent",
                            }}
                          >
                            <UserAvatar
                              src={profile.avatar_url}
                              fallback={profile.avatar_emoji}
                              size="xs"
                              className="ring-0 h-[24px] w-[24px]"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grocery push */}
                  {isCook && !isPast && slot.recipe_id && !slot.ingredients_pushed && (
                    <button
                      onClick={() => pushToGrocery(slot.id)}
                      disabled={pushing === slot.id}
                      className="mt-3 flex items-center gap-2 text-xs text-primary font-medium bg-primary/6 rounded-xl px-3 py-2.5 min-h-[40px] transition-all active:scale-[0.97] disabled:opacity-50 w-full justify-center"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {pushing === slot.id ? "Envoi..." : "Envoyer a l'epicerie"}
                    </button>
                  )}
                  {slot.ingredients_pushed && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium px-1">
                      <Check className="h-3.5 w-3.5" />
                      Ingredients envoyes
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <RecipePickerSheet
        open={!!pickerSlotId}
        onOpenChange={(open) => {
          if (!open) setPickerSlotId(null);
        }}
        onSelect={(recipe) => {
          if (pickerSlotId) selectRecipe(pickerSlotId, recipe);
        }}
      />
    </>
  );
}
