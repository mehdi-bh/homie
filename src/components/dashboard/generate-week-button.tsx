"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateWeekButton({
  label,
  targetDate,
}: {
  label: string;
  targetDate?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/weeks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetDate ? { target_date: targetDate } : {}),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Something went wrong");
        return;
      }

      if (data.alreadyGenerated) {
        setMessage("Already generated");
      } else {
        setMessage("Week generated!");
      }

      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full"
        variant="outline"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {label}
      </Button>
      {message && (
        <p className="text-xs text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}
