"use client";

import { useState } from "react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Chore = {
  id: string;
  chore_name: string;
  status: string;
  due_date: string | null;
};

function dueLabel(due: string | null): string | null {
  if (!due) return "cette semaine";
  const d = parseISO(due);
  if (isToday(d)) return "aujourd'hui";
  if (isTomorrow(d)) return "demain";
  return format(d, "EEEE", { locale: fr });
}

export function ChoreChecklist({ chores }: { chores: Chore[] }) {
  const [items, setItems] = useState(chores);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggle(chore: Chore) {
    setLoading(chore.id);
    const isDone = chore.status === "done";
    const newStatus = isDone ? "pending" : "done";

    setItems((prev) =>
      prev.map((c) => (c.id === chore.id ? { ...c, status: newStatus } : c))
    );

    const supabase = createClient();
    await supabase
      .from("chore_slots")
      .update({
        status: newStatus,
        completed_at: isDone ? null : new Date().toISOString(),
      })
      .eq("id", chore.id);

    setLoading(null);
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {items.map((chore) => {
        const isDone = chore.status === "done";
        const due = dueLabel(chore.due_date);
        return (
          <button
            key={chore.id}
            onClick={() => toggle(chore)}
            disabled={loading === chore.id}
            className="flex items-center gap-3 w-full px-1 py-1.5 rounded-lg transition-colors active:bg-muted/50 text-left"
          >
            <div
              className={cn(
                "h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                isDone
                  ? "bg-green-500 border-green-500"
                  : "border-muted-foreground/30"
              )}
            >
              {isDone && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={cn(
                "text-sm capitalize flex-1",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {chore.chore_name}
            </span>
            {due && !isDone && (
              <span className="text-[11px] text-muted-foreground">{due}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
