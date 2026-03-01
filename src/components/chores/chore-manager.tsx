"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChoreFormSheet } from "@/components/chores/chore-form-sheet";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  color: string;
};

type ChoreDefinition = {
  id: string;
  name: string;
  icon: string;
  frequency: string[];
  assignment_mode: string;
  rotation: string[];
  rotation_offset: number;
  day_assignments: Record<string, string>;
  sort_order: number;
};

const DAY_SHORT: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mer",
  thursday: "Jeu",
  friday: "Ven",
  saturday: "Sam",
  sunday: "Dim",
};

export function ChoreManager({
  choreDefs,
  profiles,
}: {
  choreDefs: ChoreDefinition[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreDefinition | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  function handleAdd() {
    setEditingChore(null);
    setSheetOpen(true);
  }

  function handleEdit(chore: ChoreDefinition) {
    setEditingChore(chore);
    setSheetOpen(true);
  }

  async function handleDelete(choreId: string) {
    setDeleting(choreId);
    const supabase = createClient();
    await supabase
      .from("chore_definitions")
      .update({ active: false })
      .eq("id", choreId);
    setDeleting(null);
    router.refresh();
  }

  function getFrequencyLabel(chore: ChoreDefinition) {
    if (chore.frequency.includes("weekly")) return "Chaque semaine";
    return chore.frequency.map((d) => DAY_SHORT[d] ?? d).join(", ");
  }

  function getAssignmentSummary(chore: ChoreDefinition) {
    if (chore.assignment_mode === "fixed" && chore.rotation.length > 0) {
      const p = profileMap[chore.rotation[0]];
      return p ? `Toujours ${p.display_name}` : "—";
    }
    if (chore.assignment_mode === "custom") {
      const entries = Object.entries(chore.day_assignments ?? {});
      if (entries.length === 0) return "Personnalisé";
      return entries
        .map(([day, uid]) => {
          const p = profileMap[uid];
          return `${DAY_SHORT[day] ?? day}: ${p?.avatar_emoji ?? "?"}`;
        })
        .join("  ");
    }
    return "Rotation";
  }

  return (
    <>
      <div className="space-y-3">
        {choreDefs.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune tâche configurée. Ajoutez-en une !
          </p>
        )}

        {choreDefs.map((chore) => (
          <div
            key={chore.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4 transition-colors",
              deleting === chore.id && "opacity-50"
            )}
          >
            <span className="text-2xl shrink-0">{chore.icon}</span>

            <div className="flex-1 min-w-0">
              <p className="font-medium">{chore.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {getFrequencyLabel(chore)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getAssignmentSummary(chore)}
                </span>
                {chore.assignment_mode === "rotation" && (
                  <span className="text-xs">
                    {chore.rotation
                      .map((id) => profileMap[id]?.avatar_emoji)
                      .filter(Boolean)
                      .join("")}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleEdit(chore)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleDelete(chore.id)}
              disabled={deleting === chore.id}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button onClick={handleAdd} className="w-full" variant="outline">
        <Plus className="h-4 w-4" />
        Ajouter une tâche
      </Button>

      <ChoreFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        profiles={profiles}
        chore={editingChore}
      />
    </>
  );
}
