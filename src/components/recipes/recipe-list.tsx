"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Recipe = {
  id: string;
  name: string;
  tags: string[];
};

export function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border bg-card pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {search ? "Aucune recette trouvee." : "Aucune recette encore."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => router.push(`/recipes/${recipe.id}`)}
              className="w-full text-left rounded-2xl bg-card shadow-sm border border-border/50 p-4 transition-all active:scale-[0.98] min-h-[52px]"
            >
              <p className="text-sm font-semibold">{recipe.name}</p>
              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
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
    </div>
  );
}
