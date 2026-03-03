"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Recipe = {
  id: string;
  name: string;
  tags: string[];
};

let cachedRecipes: Recipe[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export function RecipePickerSheet({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipe: { id: string; name: string }) => void;
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    if (cachedRecipes && Date.now() - cacheTime < CACHE_TTL) {
      setRecipes(cachedRecipes);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("recipes")
      .select("id, name, tags")
      .order("name")
      .then(({ data }: { data: Recipe[] | null }) => {
        const result = data ?? [];
        cachedRecipes = result;
        cacheTime = Date.now();
        setRecipes(result);
        setLoading(false);
      });
  }, [open]);

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Choisir une recette</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-4 max-h-[calc(70vh-140px)]">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chargement...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune recette trouvee.
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => {
                    onSelect({ id: recipe.id, name: recipe.name });
                    onOpenChange(false);
                  }}
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-colors active:bg-muted hover:bg-muted/50"
                >
                  <p className="text-sm font-medium">{recipe.name}</p>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {recipe.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="pt-3 border-t mt-3">
            <Link
              href="/recipes/new"
              className="block text-center text-sm text-primary hover:text-primary/80 transition-colors py-2"
              onClick={() => onOpenChange(false)}
            >
              + Creer une recette
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
