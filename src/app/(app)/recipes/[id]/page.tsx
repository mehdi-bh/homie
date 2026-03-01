import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, name, notes, tags")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  const { data: ingredients } = await supabase
    .from("recipe_ingredients")
    .select("id, name, quantity, unit, scaling_type, category")
    .eq("recipe_id", id)
    .order("created_at");

  return (
    <RecipeForm
      initial={{
        id: recipe.id,
        name: recipe.name,
        notes: recipe.notes ?? "",
        tags: recipe.tags ?? [],
        ingredients: (ingredients ?? []).map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          scaling_type: ing.scaling_type as "per_person" | "fixed",
          category: ing.category,
        })),
      }}
    />
  );
}
