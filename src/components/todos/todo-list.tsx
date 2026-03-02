"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type Todo = {
  id: string;
  title: string;
  note: string | null;
  created_by: string;
  completed: boolean;
  completed_at: string | null;
  priority: number;
  created_at: string;
};

type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
};

export function TodoList({
  todos: initialTodos,
  profiles,
  currentUserId,
}: {
  todos: Todo[];
  profiles: Profile[];
  currentUserId: string;
}) {
  const [todos, setTodos] = useState(initialTodos);
  const [quickAdd, setQuickAdd] = useState("");

  const todosRef = useRef(initialTodos);
  if (initialTodos !== todosRef.current) {
    todosRef.current = initialTodos;
    setTodos(initialTodos);
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const pending = todos.filter((t) => !t.completed);
  const completed = todos.filter((t) => t.completed);

  pending.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return 0;
  });

  async function addTodo(title: string) {
    if (!title.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("todos")
      .insert({ title: title.trim(), created_by: currentUserId })
      .select("id, title, note, created_by, completed, completed_at, priority, created_at")
      .single();
    if (data) {
      setTodos((prev) => [data as Todo, ...prev]);
    }
    setQuickAdd("");
  }

  async function toggleTodo(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newCompleted = !todo.completed;
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : t
      )
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

  async function togglePriority(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const newPriority = todo.priority === 1 ? 0 : 1;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t))
    );
    const supabase = createClient();
    await supabase.from("todos").update({ priority: newPriority }).eq("id", id);
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", id);
  }

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <input
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTodo(quickAdd);
          }}
          placeholder="Ajouter une tache..."
          className="flex-1 rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
        />
        <button
          onClick={() => addTodo(quickAdd)}
          disabled={!quickAdd.trim()}
          className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 disabled:opacity-50 transition-all active:scale-[0.95] min-h-[48px] shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Pending items */}
      {pending.length > 0 && (
        <div className="space-y-1">
          {pending.map((todo) => {
            const creator = profileMap.get(todo.created_by);
            return (
              <div
                key={todo.id}
                className="flex items-center gap-3 py-2.5 px-2 min-h-[48px]"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="shrink-0 h-6 w-6 rounded-lg border-2 border-muted-foreground/25 flex items-center justify-center transition-all active:scale-90"
                />
                {todo.priority === 1 && (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className="text-sm flex-1 min-w-0 truncate font-medium">{todo.title}</span>
                {creator && (
                  <UserAvatar
                    src={creator.avatar_url}
                    fallback={creator.avatar_emoji}
                    size="sm"
                    className="h-5 w-5 text-xs"
                  />
                )}
                <button
                  onClick={() => togglePriority(todo.id)}
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-90",
                    todo.priority === 1
                      ? "text-amber-500"
                      : "text-muted-foreground/20 active:text-amber-500"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground/20 active:text-destructive transition-all active:scale-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {pending.length === 0 && completed.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucune tache. Ajoutez-en une !
        </p>
      )}

      {/* Completed items */}
      {completed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Terminees ({completed.length})
          </p>
          <div className="space-y-0.5 opacity-45">
            {completed.map((todo) => {
              const creator = profileMap.get(todo.created_by);
              return (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 py-2 px-2 min-h-[40px]"
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="shrink-0 h-5 w-5 rounded-md border-2 bg-emerald-500 border-emerald-500 flex items-center justify-center transition-all active:scale-90"
                  >
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="text-sm flex-1 min-w-0 truncate line-through text-muted-foreground">
                    {todo.title}
                  </span>
                  {creator && (
                    <UserAvatar
                      src={creator.avatar_url}
                      fallback={creator.avatar_emoji}
                      size="sm"
                      className="h-5 w-5 text-xs"
                    />
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground/20 active:text-destructive transition-all active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
