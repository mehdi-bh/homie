"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">A faire</p>
        <Link href="/todos" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          Tout voir
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {todos.length > 0 ? (
        <div className="space-y-1">
          {todos.map((todo) => (
            <button
              key={todo.id}
              onClick={() => toggle(todo.id)}
              className="flex items-center gap-2 w-full text-left px-1 py-1 rounded-lg transition-colors active:bg-muted/50"
            >
              <div
                className={cn(
                  "h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                  todo.completed
                    ? "bg-green-500 border-green-500"
                    : "border-muted-foreground/30"
                )}
              >
                {todo.completed && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                className={cn(
                  "text-sm truncate",
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
