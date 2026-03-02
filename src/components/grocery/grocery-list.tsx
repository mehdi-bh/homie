"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, AlertTriangle, ShoppingCart, Check, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StaplesBar } from "./staples-bar";

type GroceryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  priority: "urgent" | "weekly";
  checked: boolean;
  source_label: string | null;
};

type GroceryStaple = {
  id: string;
  name: string;
  category: string;
  default_quantity: number | null;
  default_unit: string | null;
};

type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url: string | null;
};

export type PlannedMeal = {
  date: string;
  dayLabel: string;
  type: "dejeuner" | "souper";
  recipeName: string;
  cookName: string;
  eaterCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  legumes: "Legumes & Fruits",
  viandes: "Viandes & Poissons",
  produits_laitiers: "Produits laitiers",
  epicerie: "Epicerie",
  boissons: "Boissons",
  hygiene: "Hygiene",
  autre: "Autre",
};

type ViewMode = "category" | "recipe";

export function GroceryList({
  items: initialItems,
  staples: initialStaples,
  meals,
  currentUserId,
  dutyPerson,
}: {
  items: GroceryItem[];
  staples: GroceryStaple[];
  meals: PlannedMeal[];
  currentUserId: string;
  dutyPerson: Profile | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [quickAdd, setQuickAdd] = useState("");
  const [shoppingMode, setShoppingMode] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("recipe");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const editEscapedRef = useRef(false);

  const itemsRef = useRef(initialItems);
  if (initialItems !== itemsRef.current) {
    itemsRef.current = initialItems;
    setItems(initialItems);
  }

  const displayItems = shoppingMode
    ? items.filter((i) => !i.checked)
    : items;

  async function addItem(name: string) {
    if (!name.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("grocery_items")
      .insert({
        name: name.trim(),
        added_by: currentUserId,
        category: "autre",
      })
      .select("id, name, quantity, unit, category, priority, checked, source_label")
      .single();
    if (data) {
      setItems((prev) => [...prev, data as GroceryItem]);
    }
    setQuickAdd("");
  }

  async function addStaple(staple: GroceryStaple) {
    const supabase = createClient();
    const { data } = await supabase
      .from("grocery_items")
      .insert({
        name: staple.name,
        quantity: staple.default_quantity,
        unit: staple.default_unit,
        category: staple.category,
        added_by: currentUserId,
      })
      .select("id, name, quantity, unit, category, priority, checked, source_label")
      .single();
    if (data) {
      setItems((prev) => [...prev, data as GroceryItem]);
    }
  }

  async function toggleChecked(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked: newChecked } : i))
    );
    const supabase = createClient();
    await supabase
      .from("grocery_items")
      .update({
        checked: newChecked,
        checked_by: newChecked ? currentUserId : null,
        checked_at: newChecked ? new Date().toISOString() : null,
      })
      .eq("id", itemId);
  }

  async function toggleUrgent(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newPriority = item.priority === "urgent" ? "weekly" : "urgent";
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, priority: newPriority as GroceryItem["priority"] } : i
      )
    );
    const supabase = createClient();
    await supabase
      .from("grocery_items")
      .update({ priority: newPriority })
      .eq("id", itemId);
  }

  async function deleteItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    const supabase = createClient();
    await supabase.from("grocery_items").delete().eq("id", itemId);
  }

  function startEditing(item: GroceryItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQty(item.quantity != null ? String(item.quantity) : "");
    setEditUnit(item.unit ?? "");
  }

  async function saveEdit(itemId: string) {
    if (editEscapedRef.current) {
      editEscapedRef.current = false;
      return;
    }
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const newQty = editQty ? parseFloat(editQty) || null : null;
    const newUnit = editUnit || null;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, name: trimmed, quantity: newQty, unit: newUnit } : i
      )
    );
    setEditingId(null);
    const supabase = createClient();
    await supabase
      .from("grocery_items")
      .update({ name: trimmed, quantity: newQty, unit: newUnit })
      .eq("id", itemId);
  }

  async function finishShopping() {
    setArchiving(true);
    try {
      await fetch("/api/grocery/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setItems((prev) => prev.filter((i) => !i.checked));
      setShoppingMode(false);
    } finally {
      setArchiving(false);
    }
  }

  function renderItem(item: GroceryItem, showSource = false) {
    const isEditing = editingId === item.id;

    function handleEditBlur() {
      setTimeout(() => {
        if (editingId === item.id && !editEscapedRef.current) {
          saveEdit(item.id);
        }
      }, 150);
    }

    function handleEditKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Enter") saveEdit(item.id);
      if (e.key === "Escape") {
        editEscapedRef.current = true;
        setEditingId(null);
      }
    }

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-2 py-2.5 px-2",
          item.checked && "opacity-40"
        )}
      >
        <button
          onClick={() => toggleChecked(item.id)}
          className={cn(
            "shrink-0 rounded-md border-2 flex items-center justify-center transition-colors",
            shoppingMode ? "h-8 w-8" : "h-7 w-7",
            item.checked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30"
          )}
        >
          {item.checked && <Check className={shoppingMode ? "h-5 w-5" : "h-3.5 w-3.5"} />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5" data-edit-id={item.id}>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none border-b border-primary pb-0.5"
                placeholder="Nom"
              />
              <input
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                className="w-12 bg-transparent text-sm outline-none border-b border-primary pb-0.5 text-center"
                placeholder="Qte"
                inputMode="decimal"
              />
              <input
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                onBlur={handleEditBlur}
                onKeyDown={handleEditKeyDown}
                className="w-10 bg-transparent text-sm outline-none border-b border-primary pb-0.5 text-center"
                placeholder="u."
              />
            </div>
          ) : (
            <div onClick={() => startEditing(item)} className="cursor-text">
              <p
                className={cn(
                  "text-sm",
                  item.checked && "line-through text-muted-foreground"
                )}
              >
                {item.name}
                {item.quantity != null && (
                  <span className="text-muted-foreground ml-1">
                    ({item.quantity}
                    {item.unit ? ` ${item.unit}` : ""})
                  </span>
                )}
              </p>
              {showSource && item.source_label && (
                <p className="text-[10px] text-muted-foreground truncate">
                  {item.source_label}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => toggleUrgent(item.id)}
          className={cn(
            "shrink-0 h-10 w-10 rounded flex items-center justify-center transition-colors",
            item.priority === "urgent"
              ? "text-amber-500"
              : "text-muted-foreground/30 active:text-amber-500"
          )}
        >
          <AlertTriangle className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={() => deleteItem(item.id)}
          className="shrink-0 h-10 w-10 rounded flex items-center justify-center text-muted-foreground/30 active:text-destructive transition-colors"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>
    );
  }

  function renderByCategory() {
    const urgentItems = displayItems.filter((i) => i.priority === "urgent");
    const regularItems = displayItems.filter((i) => i.priority !== "urgent");

    const grouped = new Map<string, GroceryItem[]>();
    for (const item of regularItems) {
      const list = grouped.get(item.category) ?? [];
      list.push(item);
      grouped.set(item.category, list);
    }

    return (
      <>
        {urgentItems.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Urgent
            </p>
            <div className="divide-y">
              {urgentItems.map((item) => renderItem(item, true))}
            </div>
          </div>
        )}

        {Array.from(grouped.entries()).map(([category, catItems]) => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="divide-y">
              {catItems.map((item) => renderItem(item, true))}
            </div>
          </div>
        ))}
      </>
    );
  }

  function renderByRecipe() {
    // Group items by source_label (recipe name)
    const recipeItems = new Map<string, GroceryItem[]>();
    const otherItems: GroceryItem[] = [];

    for (const item of displayItems) {
      if (item.source_label) {
        // source_label can be "Recipe A" or "Recipe A, Recipe B" (merged)
        const key = item.source_label;
        const list = recipeItems.get(key) ?? [];
        list.push(item);
        recipeItems.set(key, list);
      } else {
        otherItems.push(item);
      }
    }

    const urgentItems = displayItems.filter((i) => i.priority === "urgent");

    return (
      <>
        {/* Urgent section */}
        {urgentItems.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Urgent
            </p>
            <div className="divide-y">
              {urgentItems.map((item) => renderItem(item, true))}
            </div>
          </div>
        )}

        {/* Planned meals with their ingredients */}
        {meals.map((meal) => {
          const mealItems = recipeItems.get(meal.recipeName) ?? [];
          const typeLabel = meal.type === "dejeuner" ? "Dej." : "Souper";

          return (
            <div key={`${meal.date}-${meal.type}`} className="rounded-xl border p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">{meal.recipeName}</p>
                <span className="text-[10px] text-muted-foreground">
                  {meal.eaterCount} pers.
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">
                {meal.dayLabel} · {typeLabel} · {meal.cookName}
              </p>
              {mealItems.length > 0 ? (
                <div className="divide-y">
                  {mealItems.filter((i) => i.priority !== "urgent").map((item) => renderItem(item))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic py-1">
                  Pas encore envoye a l&apos;epicerie
                </p>
              )}
            </div>
          );
        })}

        {/* Recipes not linked to a planned meal (merged or orphaned) */}
        {Array.from(recipeItems.entries())
          .filter(([label]) => !meals.some((m) => m.recipeName === label))
          .map(([label, items]) => (
            <div key={label} className="rounded-xl border p-3">
              <p className="text-sm font-medium mb-2">{label}</p>
              <div className="divide-y">
                {items.filter((i) => i.priority !== "urgent").map((item) => renderItem(item))}
              </div>
            </div>
          ))}

        {/* Other items (manual adds) */}
        {otherItems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Autres articles
            </p>
            <div className="divide-y">
              {otherItems.map((item) => renderItem(item, false))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Duty badge */}
      {dutyPerson && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>
            Courses: <strong>{dutyPerson.display_name}</strong>
            {dutyPerson.id === currentUserId && " (toi)"}
          </span>
        </div>
      )}

      {/* Mode toggles */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("recipe")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-colors",
              viewMode === "recipe"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground"
            )}
          >
            Par recette
          </button>
          <button
            onClick={() => setViewMode("category")}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full transition-colors",
              viewMode === "category"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground"
            )}
          >
            Par categorie
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShoppingMode(!shoppingMode)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              shoppingMode
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground"
            )}
          >
            {shoppingMode ? "Courses" : "Courses"}
          </button>

          {shoppingMode && items.some((i) => i.checked) && (
            <button
              onClick={finishShopping}
              disabled={archiving}
              className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {archiving ? "..." : "Terminer"}
            </button>
          )}
        </div>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <input
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem(quickAdd);
          }}
          placeholder="Ajouter un article..."
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => addItem(quickAdd)}
          disabled={!quickAdd.trim()}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50 transition-colors active:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Staples bar */}
      {initialStaples.length > 0 && (
        <StaplesBar staples={initialStaples} onAdd={addStaple} />
      )}

      {/* Items */}
      {viewMode === "category" ? renderByCategory() : renderByRecipe()}

      {items.length === 0 && meals.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Liste vide. Ajoutez des articles ou envoyez des recettes.
        </p>
      )}
    </div>
  );
}
