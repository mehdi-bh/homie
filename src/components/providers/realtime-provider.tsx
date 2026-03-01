"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerServiceWorker, subscribeToPush, sendSubscriptionToServer } from "@/lib/push";

const REALTIME_TABLES = [
  "grocery_items",
  "dinner_slots",
  "lunch_slots",
  "lunch_preferences",
  "chore_slots",
  "car_reservations",
  "swaps",
] as const;

const DEBOUNCE_MS = 500;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(() => {
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
        debouncedRefresh
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
