"use client";

import { useEffect } from "react";
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

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase.channel("homie-realtime");

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh()
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
      supabase.removeChannel(channel);
    };
  }, [router]);

  return <>{children}</>;
}
