"use client";

import { useState } from "react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="space-y-1.5">
      {items.map((chore) => {
        const isDone = chore.status === "done";
        const due = dueLabel(chore.due_date);
        return (
          <button
            key={chore.id}
            onClick={() => toggle(chore)}
            disabled={loading === chore.id}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl transition-all active:scale-[0.98] bg-card border border-border/50 shadow-sm text-left min-h-[48px]"
          >
            <motion.div
              animate={{ scale: isDone ? 1 : 1 }}
              className={cn(
                "h-6 w-6 rounded-lg shrink-0 flex items-center justify-center transition-colors",
                isDone
                  ? "bg-emerald-500"
                  : "border-2 border-muted-foreground/25"
              )}
            >
              <AnimatePresence>
                {isDone && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="h-3.5 w-3.5 text-white"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.div>
            <span
              className={cn(
                "text-sm capitalize flex-1 font-medium",
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
