"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
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
      <div className="flex gap-1 rounded-lg bg-muted p-1 flex-1">
        <button
          onClick={() => setTab("souper")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab !== "dejeuner"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Souper
        </button>
        <button
          onClick={() => setTab("dejeuner")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "dejeuner"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Dejeuner
        </button>
      </div>
      <Link
        href="/recipes"
        className="shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <BookOpen className="h-4 w-4" />
        Recettes
      </Link>
    </div>
  );
}
