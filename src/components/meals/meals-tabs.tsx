"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MealsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "souper";

  function setTab(t: "souper" | "dejeuner") {
    const params = new URLSearchParams(searchParams.toString());
    if (t === "dejeuner") {
      params.set("tab", "dejeuner");
    } else {
      params.delete("tab");
    }
    router.push(`/meals?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1 rounded-2xl bg-muted/60 p-1 flex-1">
        <button
          onClick={() => setTab("dejeuner")}
          className={cn(
            "relative flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors min-h-[40px]",
            tab === "dejeuner" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {tab === "dejeuner" && (
            <motion.div
              layoutId="meals-tab"
              className="absolute inset-0 bg-card rounded-xl shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" />Lunch</span>
        </button>
        <button
          onClick={() => setTab("souper")}
          className={cn(
            "relative flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors min-h-[40px]",
            tab !== "dejeuner" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {tab !== "dejeuner" && (
            <motion.div
              layoutId="meals-tab"
              className="absolute inset-0 bg-card rounded-xl shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />Souper</span>
        </button>
      </div>
      <Link
        href="/recipes"
        className="shrink-0 flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] active:scale-[0.97]"
      >
        <BookOpen className="h-4 w-4" />
        Recettes
      </Link>
    </div>
  );
}
