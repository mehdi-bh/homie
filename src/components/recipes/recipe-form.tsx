"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const UNITS = ["g", "kg", "ml", "L", "unite", "c. a soupe", "c. a cafe"] as const;
const CATEGORIES = [
  { value: "legumes", label: "Legumes" },
  { value: "viandes", label: "Viandes" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "epicerie", label: "Epicerie" },
  { value: "boissons", label: "Boissons" },
  { value: "hygiene", label: "Hygiene" },
  { value: "autre", label: "Autre" },
] as const;

type Ingredient = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  scaling_type: "per_person" | "fixed";
  category: string;
};

type RecipeData = {
  id?: string;
  name: string;
  notes: string;
  tags: string[];
  ingredients: Ingredient[];
};

export function RecipeForm({
  initial,
}: {
  initial?: RecipeData;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tagsInput, setTagsInput] = useState(initial?.tags?.join(", ") ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients ?? []
  );
  const [saving, setSaving] = useState(false);

  function addIngredient() {
    setIngredients((prev) => [
      ...prev,
      { name: "", quantity: 1, unit: "g", scaling_type: "per_person", category: "autre" },
    ]);
  }

  function updateIngredient(index: number, updates: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (isEdit && initial?.id) {
        await supabase
          .from("recipes")
          .update({ name: name.trim(), notes: notes.trim() || null, tags })
          .eq("id", initial.id);

        // Delete old ingredients and insert new
        await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", initial.id);

        if (ingredients.length > 0) {
          await supabase.from("recipe_ingredients").insert(
            ingredients
              .filter((ing) => ing.name.trim())
              .map((ing) => ({
                recipe_id: initial.id,
                name: ing.name.trim(),
                quantity: ing.quantity,
                unit: ing.unit,
                scaling_type: ing.scaling_type,
                category: ing.category,
              }))
          );
        }
      } else {
        const { data: recipe } = await supabase
          .from("recipes")
          .insert({ name: name.trim(), notes: notes.trim() || null, tags })
          .select("id")
          .single();

        if (recipe && ingredients.length > 0) {
          await supabase.from("recipe_ingredients").insert(
            ingredients
              .filter((ing) => ing.name.trim())
              .map((ing) => ({
                recipe_id: recipe.id,
                name: ing.name.trim(),
                quantity: ing.quantity,
                unit: ing.unit,
                scaling_type: ing.scaling_type,
                category: ing.category,
              }))
          );
        }
      }

      router.push("/recipes");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().eq("id", initial.id);
    router.push("/recipes");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/recipes"
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">
          {isEdit ? "Modifier la recette" : "Nouvelle recette"}
        </h1>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Poulet roti"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions, astuces..."
          rows={3}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Tags (separes par des virgules)
        </label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="rapide, vegetarien, ete"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Ingredients */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Ingredients
          </label>
          <button
            onClick={addIngredient}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </button>
        </div>

        {ingredients.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun ingredient. Appuyez sur &quot;Ajouter&quot;.
          </p>
        )}

        {ingredients.map((ing, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                placeholder="Nom de l'ingredient"
                className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/20"
              />
              <button
                onClick={() => removeIngredient(i)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(i, { quantity: parseFloat(e.target.value) || 0 })
                }
                className="w-16 rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/20"
                step="any"
                min="0"
              />
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  updateIngredient(i, {
                    scaling_type:
                      ing.scaling_type === "per_person" ? "fixed" : "per_person",
                  })
                }
                className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                  ing.scaling_type === "per_person"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {ing.scaling_type === "per_person" ? "/pers." : "fixe"}
              </button>
            </div>

            <select
              value={ing.category}
              onChange={(e) => updateIngredient(i, { category: e.target.value })}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50 transition-colors active:bg-primary/90"
        >
          {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Creer"}
        </button>
        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg border border-destructive/30 text-destructive px-4 py-2.5 text-sm font-medium disabled:opacity-50 transition-colors active:bg-destructive/10"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
