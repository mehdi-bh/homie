"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
};

export function TodoWidget({
  todos: initialTodos,
  totalCount,
}: {
  todos: Todo[];
  totalCount: number;
}) {
  const [todos, setTodos] = useState(initialTodos);

  async function toggle(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t))
    );
    const supabase = createClient();
    await supabase
      .from("todos")
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", id);
  }

  const remaining = totalCount - todos.length;

  return (
    <div className="rounded-2xl bg-card shadow-sm border border-border/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A faire</p>
        <Link href="/todos" className="flex items-center gap-1 text-xs text-primary font-medium">
          Tout voir
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {todos.length > 0 ? (
        <div className="space-y-1.5">
          {todos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => toggle(todo.id)}
              className="flex items-center gap-3 w-full text-left px-1 py-2 rounded-xl transition-all active:scale-[0.98] min-h-[40px]"
            >
              <motion.div
                className={cn(
                  "h-5 w-5 rounded-md shrink-0 flex items-center justify-center transition-colors",
                  todo.completed
                    ? "bg-emerald-500"
                    : "border-2 border-muted-foreground/25"
                )}
              >
                <AnimatePresence>
                  {todo.completed && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="h-3 w-3 text-white"
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
                  "text-sm truncate font-medium",
                  todo.completed && "line-through text-muted-foreground"
                )}
              >
                {todo.title}
              </span>
            </button>
          ))}
          {remaining > 0 && (
            <Link href="/todos" className="block text-xs text-muted-foreground pl-1 pt-0.5">
              et {remaining} autre{remaining > 1 ? "s" : ""}...
            </Link>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Rien a faire !</p>
      )}
    </div>
  );
}
