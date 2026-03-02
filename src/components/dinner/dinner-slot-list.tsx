"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ShoppingCart, Check, SkipForward, Undo2 } from "lucide-react";
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

export type DinnerSlot = {
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
    await supabase.from("dinner_slots").update({ note }).eq("id", slotId);
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
      .from("dinner_slots")
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
      .from("dinner_slots")
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
      .from("dinner_slots")
      .update({ eaters: newEaters })
      .eq("id", slotId);
  }

  async function toggleSkip(slotId: string, currentStatus: string) {
    const newStatus = currentStatus === "skipped" ? "pending" : "skipped";
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: newStatus as DinnerSlot["status"] }
          : s
      )
    );
    const supabase = createClient();
    await supabase
      .from("dinner_slots")
      .update({ status: newStatus })
      .eq("id", slotId);
  }

  async function pushToGrocery(slotId: string) {
    setPushing(slotId);
    try {
      const res = await fetch("/api/grocery/push-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, slotType: "dinner" }),
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
                "rounded-2xl bg-card shadow-sm border border-border/50 p-4",
                isToday && "ring-2 ring-primary/20 shadow-md",
                isPast && "opacity-45",
                isSkipped && "opacity-30"
              )}
              style={{
                borderLeftWidth: 4,
                borderLeftColor: isSkipped ? "#9ca3af" : slot.cook.color,
              }}
            >
              {/* Row 1: Day + today badge + skip */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-bold capitalize text-[15px]">{dayLabel}</p>
                  {isToday && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Aujourd&apos;hui
                    </span>
                  )}
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
                      <>
                        <SkipForward className="h-3 w-3" />
                        Skip
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Row 2: Cook */}
              <div className="flex items-center gap-2 mt-1.5">
                <UserAvatar
                  src={slot.cook.avatar_url}
                  fallback={slot.cook.avatar_emoji}
                  size="sm"
                />
                <span className="text-sm text-muted-foreground">
                  {slot.cook.display_name}
                  {isCook && " (toi)"}
                </span>
              </div>

              {!isSkipped && (
                <>
                  {/* Recipe */}
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (isCook && !isPast) setPickerSlotId(slot.id);
                      }}
                      disabled={!isCook || isPast}
                      className={cn(
                        "text-sm w-full text-left rounded-xl px-3 py-2.5 min-h-[44px] flex items-center transition-all",
                        slot.recipe_name
                          ? "text-foreground font-semibold bg-muted/30"
                          : "text-muted-foreground italic bg-muted/20",
                        isCook && !isPast && "active:scale-[0.98] active:bg-muted/50"
                      )}
                    >
                      {slot.recipe_name ||
                        (isCook && !isPast
                          ? "Choisir une recette..."
                          : "Pas encore decide")}
                    </button>
                    {slot.recipe_name && isCook && !isPast && (
                      <button
                        onClick={() => clearRecipe(slot.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground mt-1 ml-3"
                      >
                        Retirer la recette
                      </button>
                    )}
                  </div>

                  {/* Note (anyone can edit) */}
                  <div className="mt-2">
                    {editing === slot.id ? (
                      <input
                        autoFocus
                        className="w-full bg-transparent text-sm outline-none border-b-2 border-primary pb-1 text-muted-foreground px-1"
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
                        placeholder="Ajouter une note..."
                      />
                    ) : (
                      <p
                        className={cn(
                          "text-xs px-1 py-1 rounded-lg transition-colors",
                          slot.note
                            ? "text-muted-foreground"
                            : "text-muted-foreground/30 italic",
                          !isPast && "cursor-text active:bg-muted/30"
                        )}
                        onClick={() => {
                          if (!isPast) {
                            setEditing(slot.id);
                            setEditValue(slot.note || "");
                          }
                        }}
                      >
                        {slot.note || "Ajouter une note..."}
                      </p>
                    )}
                  </div>

                  {/* Eaters */}
                  <div className="flex items-center gap-1.5 mt-3">
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
                            "h-10 w-10 rounded-full flex items-center justify-center transition-all border-[2.5px] active:scale-90",
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
                            size="sm"
                            className="ring-0 h-[30px] w-[30px]"
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs text-muted-foreground ml-1 font-medium">
                      {slot.eaters.length} pers.
                    </span>
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
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
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
