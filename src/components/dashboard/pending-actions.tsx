"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  X,
  Sun,
  Moon,
  CheckSquare,
  ShoppingCart,
  ListTodo,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  sun: <Sun className="h-4 w-4 text-amber-500" />,
  moon: <Moon className="h-4 w-4 text-indigo-400" />,
  chore: <CheckSquare className="h-4 w-4 text-violet-500" />,
  grocery: <ShoppingCart className="h-4 w-4 text-emerald-500" />,
  todo: <ListTodo className="h-4 w-4 text-blue-500" />,
  calendar: <CalendarDays className="h-4 w-4 text-rose-500" />,
} as const;

type ActionIcon = keyof typeof icons;

export function PendingActions({
  actions,
}: {
  actions: Array<{ text: string; href: string; icon: ActionIcon }>;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed || actions.length === 0) return null;

  return (
    <div className="rounded-2xl bg-primary/6 border border-primary/10 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
          {actions.length}
        </span>
        <span className="text-sm font-medium flex-1">
          Action{actions.length > 1 ? "s" : ""} en attente
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </button>

      {expanded && (
        <div className="px-2 pb-2 space-y-0.5">
          {actions.map((action) => (
            <Link
              key={action.text}
              href={action.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all active:scale-[0.98] active:bg-primary/5"
            >
              {icons[action.icon]}
              <span className="flex-1">{action.text}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
