"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Sparkles, Loader2, Send } from "lucide-react";
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
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg = { role: "user" as const, content: text };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la generation");
      }
      const data = await res.json();
      setName(data.name);
      if (data.notes) setNotes(data.notes);
      setIngredients(data.ingredients);
      const summary = `${data.name} — ${data.ingredients.length} ingredients`;
      setChatMessages((prev) => [...prev, { role: "assistant", content: summary }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
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
      <div className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted/50 transition-all active:scale-[0.95]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">
          {isEdit ? "Modifier la recette" : "Nouvelle recette"}
        </h1>
      </div>

      {/* AI Chat */}
      {!isEdit && (
        <div className="rounded-2xl border-2 border-dashed border-primary/15 bg-primary/3 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Generation rapide
          </div>

          {chatMessages.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <p
                  key={i}
                  className={`text-xs px-3 py-2 rounded-2xl w-fit max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-auto"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.content}
                </p>
              ))}
              {generating && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generation...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {aiError && (
            <p className="text-xs text-destructive">{aiError}</p>
          )}

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={
                chatMessages.length === 0
                  ? "Decris ta recette: Pasta pesto poulet..."
                  : "Modifier: enleve la creme, ajoute des champignons..."
              }
              className="flex-1 rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
            />
            <button
              onClick={sendChat}
              disabled={generating || !chatInput.trim()}
              className="shrink-0 rounded-2xl bg-primary text-primary-foreground px-4 py-3 disabled:opacity-50 transition-all active:scale-[0.95] min-h-[48px]"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Poulet roti"
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Instructions, astuces..."
          rows={3}
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none shadow-sm"
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tags (separes par des virgules)
        </label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="rapide, vegetarien, ete"
          className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
        />
      </div>

      {/* Ingredients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ingredients
          </label>
          <button
            onClick={addIngredient}
            className="flex items-center gap-1 text-xs text-primary font-semibold transition-colors"
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
          <div key={i} className="rounded-2xl bg-card shadow-sm border border-border/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                placeholder="Nom de l'ingredient"
                className="flex-1 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/20 min-h-[40px]"
              />
              <button
                onClick={() => removeIngredient(i)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(i, { quantity: parseFloat(e.target.value) || 0 })
                }
                className="w-16 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/20 min-h-[36px]"
                step="any"
                min="0"
              />
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                className="rounded-xl border bg-background px-3 py-2 text-sm outline-none min-h-[36px]"
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
                className={`text-[10px] font-medium px-2.5 py-1.5 rounded-full border transition-all active:scale-95 ${
                  ing.scaling_type === "per_person"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {ing.scaling_type === "per_person" ? "/pers." : "fixe"}
              </button>
            </div>

            <select
              value={ing.category}
              onChange={(e) => updateIngredient(i, { category: e.target.value })}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none min-h-[36px]"
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
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] min-h-[52px] shadow-sm"
        >
          {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Creer"}
        </button>
        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="rounded-2xl border border-destructive/30 text-destructive px-5 py-3.5 text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] active:bg-destructive/10 min-h-[52px]"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
