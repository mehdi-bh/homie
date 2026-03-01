import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeList } from "@/components/recipes/recipe-list";

export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipes } = await supabase
    .from("recipes")
    .select("id, name, tags")
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recettes"
        action={
          <Link
            href="/recipes/new"
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nouvelle
          </Link>
        }
      />
      <RecipeList recipes={recipes ?? []} />
    </div>
  );
}
