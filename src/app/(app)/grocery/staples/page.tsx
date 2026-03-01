"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  { value: "legumes", label: "Legumes" },
  { value: "viandes", label: "Viandes" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "epicerie", label: "Epicerie" },
  { value: "boissons", label: "Boissons" },
  { value: "hygiene", label: "Hygiene" },
  { value: "autre", label: "Autre" },
];

type Staple = {
  id: string;
  name: string;
  category: string;
  default_quantity: number | null;
  default_unit: string | null;
};

export default function StaplesPage() {
  const [staples, setStaples] = useState<Staple[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("autre");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("grocery_staples")
      .select("id, name, category, default_quantity, default_unit")
      .order("sort_order")
      .then(({ data }) => setStaples(data ?? []));
  }, []);

  async function addStaple() {
    if (!newName.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("grocery_staples")
      .insert({ name: newName.trim(), category: newCategory })
      .select("id, name, category, default_quantity, default_unit")
      .single();
    if (data) {
      setStaples((prev) => [...prev, data as Staple]);
      setNewName("");
    }
  }

  async function deleteStaple(id: string) {
    setStaples((prev) => prev.filter((s) => s.id !== id));
    const supabase = createClient();
    await supabase.from("grocery_staples").delete().eq("id", id);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/grocery"
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">Produits habituels</h1>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addStaple();
            }}
            placeholder="Nom du produit..."
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-lg border bg-background px-2 py-2 text-sm outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={addStaple}
            disabled={!newName.trim()}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {staples.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun produit habituel. Ajoutez-en pour les retrouver rapidement.
        </p>
      ) : (
        <div className="space-y-1">
          {staples.map((staple) => (
            <div
              key={staple.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{staple.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORIES.find((c) => c.value === staple.category)?.label ?? staple.category}
                </p>
              </div>
              <button
                onClick={() => deleteStaple(staple.id)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
