"use client";

import { useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type ChoreSlot = {
  id: string;
  chore_name: string;
  status: "pending" | "done" | "skipped";
  completed_at: string | null;
  note: string | null;
  due_date: string | null;
  assigned_to: {
    id: string;
    display_name: string;
    color: string;
    avatar_emoji: string;
    avatar_url: string | null;
  };
};

type GroupedChores = {
  label: string;
  isToday: boolean;
  chores: ChoreSlot[];
};

function groupChoresByDay(chores: ChoreSlot[]): GroupedChores[] {
  const weekly: ChoreSlot[] = [];
  const byDate = new Map<string, ChoreSlot[]>();

  for (const chore of chores) {
    if (!chore.due_date) {
      weekly.push(chore);
    } else {
      const existing = byDate.get(chore.due_date) ?? [];
      existing.push(chore);
      byDate.set(chore.due_date, existing);
    }
  }

  const groups: GroupedChores[] = [];

  if (weekly.length > 0) {
    groups.push({ label: "Cette semaine", isToday: false, chores: weekly });
  }

  const sortedDates = [...byDate.keys()].sort();
  for (const date of sortedDates) {
    const parsed = parseISO(date);
    const dayLabel = format(parsed, "EEEE", { locale: fr });
    groups.push({
      label: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
      isToday: isToday(parsed),
      chores: byDate.get(date)!,
    });
  }

  return groups;
}

export function ChoreList({
  chores: initialChores,
  currentUserId,
}: {
  chores: ChoreSlot[];
  currentUserId: string;
}) {
  const [chores, setChores] = useState(initialChores);

  // Sync with server data when props change (realtime refresh)
  const choresRef = useRef(initialChores);
  if (initialChores !== choresRef.current) {
    choresRef.current = initialChores;
    setChores(initialChores);
  }

  async function toggleChore(chore: ChoreSlot) {
    const isDone = chore.status === "done";
    const newStatus = isDone ? "pending" : "done";

    // Optimistic update
    setChores((prev) =>
      prev.map((c) =>
        c.id === chore.id
          ? { ...c, status: newStatus as ChoreSlot["status"], completed_at: isDone ? null : new Date().toISOString() }
          : c
      )
    );

    const supabase = createClient();
    await supabase
      .from("chore_slots")
      .update({
        status: newStatus,
        completed_at: isDone ? null : new Date().toISOString(),
      })
      .eq("id", chore.id);
  }

  if (chores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No chores this week. Generate a week first.
      </p>
    );
  }

  const groups = groupChoresByDay(chores);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <h3
            className={cn(
              "text-sm font-semibold capitalize",
              group.isToday
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {group.label}
            {group.isToday && (
              <span className="ml-2 text-xs font-normal">(aujourd&apos;hui)</span>
            )}
          </h3>

          {group.chores.map((chore) => {
            const isDone = chore.status === "done";
            const isMine = chore.assigned_to.id === currentUserId;

            return (
              <div
                key={chore.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 transition-colors",
                  isDone && "bg-muted/50"
                )}
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: chore.assigned_to.color,
                }}
              >
                <button
                  onClick={() => toggleChore(chore)}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-95",
                    isDone
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : null}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium capitalize",
                      isDone && "line-through text-muted-foreground"
                    )}
                  >
                    {chore.chore_name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <UserAvatar src={chore.assigned_to.avatar_url} fallback={chore.assigned_to.avatar_emoji} size="sm" />
                    {chore.assigned_to.display_name}
                    {isMine && (
                      <span className="ml-1 text-xs opacity-60">(you)</span>
                    )}
                  </p>
                </div>

                {isDone && (
                  <button
                    onClick={() => toggleChore(chore)}
                    className="text-muted-foreground p-2"
                    title="Mark as not done"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
