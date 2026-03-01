"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const ICONS = ["🧹", "🍽️", "🗑️", "🧺", "🚿", "🧽", "🪣", "🌿"];

const DAYS = [
  { value: "monday", label: "Lun" },
  { value: "tuesday", label: "Mar" },
  { value: "wednesday", label: "Mer" },
  { value: "thursday", label: "Jeu" },
  { value: "friday", label: "Ven" },
  { value: "saturday", label: "Sam" },
  { value: "sunday", label: "Dim" },
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mer",
  thursday: "Jeu",
  friday: "Ven",
  saturday: "Sam",
  sunday: "Dim",
};

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

export function ChoreFormSheet({
  open,
  onOpenChange,
  profiles,
  chore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: Profile[];
  chore?: ChoreDefinition | null;
}) {
  const router = useRouter();
  const isEdit = !!chore;

  const [name, setName] = useState(chore?.name ?? "");
  const [icon, setIcon] = useState(chore?.icon ?? "🧹");
  const [frequency, setFrequency] = useState<string[]>(
    chore?.frequency ?? ["weekly"]
  );
  const [assignmentMode, setAssignmentMode] = useState<
    "rotation" | "fixed" | "custom"
  >((chore?.assignment_mode as "rotation" | "fixed" | "custom") ?? "rotation");
  const [selectedRotation, setSelectedRotation] = useState<string[]>(
    chore?.rotation ?? profiles.map((p) => p.id)
  );
  const [fixedPerson, setFixedPerson] = useState<string>(
    chore?.assignment_mode === "fixed"
      ? chore.rotation[0] ?? profiles[0]?.id ?? ""
      : profiles[0]?.id ?? ""
  );
  const [dayAssignments, setDayAssignments] = useState<Record<string, string>>(
    chore?.day_assignments ?? {}
  );
  const [saving, setSaving] = useState(false);

  const isWeekly = frequency.includes("weekly");
  const selectedDays = isWeekly ? [] : frequency;

  function resetForm() {
    setName("");
    setIcon("🧹");
    setFrequency(["weekly"]);
    setAssignmentMode("rotation");
    setSelectedRotation(profiles.map((p) => p.id));
    setFixedPerson(profiles[0]?.id ?? "");
    setDayAssignments({});
  }

  function toggleDay(day: string) {
    if (day === "weekly") {
      setFrequency(["weekly"]);
      return;
    }
    setFrequency((prev) => {
      const withoutWeekly = prev.filter((d) => d !== "weekly");
      if (withoutWeekly.includes(day)) {
        const result = withoutWeekly.filter((d) => d !== day);
        return result.length === 0 ? ["weekly"] : result;
      }
      return [...withoutWeekly, day];
    });
  }

  function setDayPerson(day: string, personId: string) {
    setDayAssignments((prev) => ({ ...prev, [day]: personId }));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const rotation =
      assignmentMode === "fixed" ? [fixedPerson] : selectedRotation;

    const payload = {
      name: name.trim(),
      icon,
      frequency,
      assignment_mode: assignmentMode,
      rotation: assignmentMode === "custom" ? [] : rotation,
      rotation_offset: chore?.rotation_offset ?? 0,
      day_assignments: assignmentMode === "custom" ? dayAssignments : {},
    };

    if (isEdit) {
      await supabase
        .from("chore_definitions")
        .update(payload)
        .eq("id", chore.id);
    } else {
      await supabase.from("chore_definitions").insert(payload);
    }

    setSaving(false);
    onOpenChange(false);
    if (!isEdit) resetForm();
    router.refresh();
  }

  function moveToFront(profileId: string) {
    setSelectedRotation((prev) => {
      const filtered = prev.filter((id) => id !== profileId);
      return [profileId, ...filtered];
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Modifier" : "Ajouter une tâche"}</SheetTitle>
          <SheetDescription className="sr-only">
            {isEdit ? "Modifier la tâche" : "Ajouter une nouvelle tâche"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aspirateur"
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all",
                    icon === i
                      ? "bg-primary/10 ring-2 ring-primary scale-110"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => setIcon(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Quand</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  isWeekly
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                onClick={() => toggleDay("weekly")}
              >
                Chaque semaine
              </button>
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                    selectedDays.includes(d.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => toggleDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment mode */}
          <div className="space-y-3">
            <Label>Qui</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  assignmentMode === "rotation"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                onClick={() => setAssignmentMode("rotation")}
              >
                Rotation
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  assignmentMode === "fixed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                onClick={() => setAssignmentMode("fixed")}
              >
                Toujours
              </button>
              {!isWeekly && (
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                    assignmentMode === "custom"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => setAssignmentMode("custom")}
                >
                  Personnalisé
                </button>
              )}
            </div>

            {/* Rotation / Fixed: profile selection */}
            {assignmentMode !== "custom" && (
              <div className="flex gap-3">
                {profiles.map((p) => {
                  const isSelected =
                    assignmentMode === "fixed"
                      ? fixedPerson === p.id
                      : selectedRotation.includes(p.id);
                  const isFirst =
                    assignmentMode === "rotation" &&
                    selectedRotation[0] === p.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl p-2 transition-all min-w-[60px]",
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "opacity-40"
                      )}
                      onClick={() => {
                        if (assignmentMode === "fixed") {
                          setFixedPerson(p.id);
                        } else {
                          moveToFront(p.id);
                        }
                      }}
                    >
                      <span className="text-2xl">{p.avatar_emoji}</span>
                      <span className="text-xs font-medium truncate max-w-[56px]">
                        {p.display_name}
                      </span>
                      {isFirst && (
                        <span className="text-[10px] text-primary font-medium">
                          Commence
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom: per-day person mapping */}
            {assignmentMode === "custom" && !isWeekly && (
              <div className="space-y-2">
                {selectedDays.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-10">
                      {DAY_LABELS[day]}
                    </span>
                    <div className="flex gap-2">
                      {profiles.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={cn(
                            "h-9 w-9 rounded-full text-lg flex items-center justify-center transition-all",
                            dayAssignments[day] === p.id
                              ? "ring-2 ring-primary scale-110"
                              : "opacity-30"
                          )}
                          onClick={() => setDayPerson(day, p.id)}
                        >
                          {p.avatar_emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full"
          >
            {saving ? "Enregistrement..." : isEdit ? "Modifier" : "Ajouter"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
