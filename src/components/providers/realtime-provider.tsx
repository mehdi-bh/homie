"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerServiceWorker, subscribeToPush, sendSubscriptionToServer } from "@/lib/push";

const REALTIME_TABLES = [
  "grocery_items",
  "grocery_staples",
  "dinner_slots",
  "lunch_slots",
  "lunch_preferences",
  "chore_slots",
  "calendar_events",
  "todos",
  "swaps",
  "recipes",
  "recipe_ingredients",
] as const;

const PAGE_TABLES: Record<string, string[]> = {
  "/dashboard": ["todos", "calendar_events", "dinner_slots", "lunch_slots", "chore_slots", "grocery_items"],
  "/grocery": ["grocery_items", "grocery_staples"],
  "/meals": ["dinner_slots", "lunch_slots", "recipes"],
  "/chores": ["chore_slots"],
  "/todos": ["todos"],
  "/agenda": ["calendar_events"],
  "/week": ["dinner_slots", "lunch_slots", "chore_slots"],
  "/recipes": ["recipes", "recipe_ingredients"],
};

const DEBOUNCE_MS = 500;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const debouncedRefresh = useCallback((table: string) => {
    const current = pathnameRef.current;
    const relevantTables = PAGE_TABLES[current];
    if (relevantTables && !relevantTables.includes(table)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => router.refresh(), DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel("homie-realtime");

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => debouncedRefresh(table)
      );
    }

    channel.subscribe();

    // Register service worker and push subscription
    registerServiceWorker().then(async (registration) => {
      if (!registration) return;
      const subscription = await subscribeToPush(registration);
      if (subscription) {
        await sendSubscriptionToServer(subscription);
      }
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [debouncedRefresh]);

  return <>{children}</>;
}
