"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

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
        setMessage(data.error || "Erreur");
        return;
      }

      if (data.alreadyGenerated) {
        setMessage("Deja generee");
      } else {
        setMessage("Semaine generee !");
      }

      router.refresh();
    } catch {
      setMessage("Erreur reseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/4 px-4 py-4 text-sm font-semibold text-primary transition-all active:scale-[0.98] disabled:opacity-50 min-h-[52px]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {label}
      </button>
      {message && (
        <p className="text-xs text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}
