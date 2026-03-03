import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slotId, slotType } = await req.json();
  if (!slotId || !["dinner", "lunch"].includes(slotType)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const table = slotType === "dinner" ? "dinner_slots" : "lunch_slots";

  const { data: slot, error: slotError } = await supabase
    .from(table)
    .select("id, recipe_id, eaters, week_id")
    .eq("id", slotId)
    .single();

  if (slotError || !slot || !slot.recipe_id) {
    return NextResponse.json(
      { error: "Slot or recipe not found", detail: slotError?.message },
      { status: 404 }
    );
  }

  const { data: ingredients, error: ingError } = await supabase
    .from("recipe_ingredients")
    .select("name, quantity, unit, scaling_type, category")
    .eq("recipe_id", slot.recipe_id);

  if (ingError) {
    return NextResponse.json(
      { error: "Failed to fetch ingredients", detail: ingError.message },
      { status: 500 }
    );
  }

  if (!ingredients || ingredients.length === 0) {
    await supabase
      .from(table)
      .update({ ingredients_pushed: true })
      .eq("id", slotId);
    return NextResponse.json({ success: true, itemCount: 0 });
  }

  const { data: recipe } = await supabase
    .from("recipes")
    .select("name")
    .eq("id", slot.recipe_id)
    .single();

  const eaterCount = (slot.eaters as string[])?.length || 1;
  const sourceLabel = recipe?.name ?? "Recette";

  // Fire all RPC calls in parallel
  const errors: string[] = [];

  const results = await Promise.all(
    ingredients.map(async (ing) => {
      const quantity =
        ing.scaling_type === "per_person"
          ? Number(ing.quantity) * eaterCount
          : Number(ing.quantity);

      const { error: rpcError } = await supabase.rpc("merge_grocery_item", {
        p_name: ing.name,
        p_quantity: quantity,
        p_unit: ing.unit,
        p_category: ing.category,
        p_added_by: user.id,
        p_source_recipe_id: slot.recipe_id,
        p_source_label: sourceLabel,
        p_week_id: slot.week_id,
      });

      if (rpcError) {
        // Fallback: direct insert
        const { error: insertError } = await supabase
          .from("grocery_items")
          .insert({
            name: ing.name,
            quantity,
            unit: ing.unit,
            category: ing.category,
            added_by: user.id,
            source_recipe_id: slot.recipe_id,
            source_label: sourceLabel,
            week_id: slot.week_id,
          });

        if (insertError) {
          errors.push(`${ing.name}: ${insertError.message}`);
          return false;
        }
      }
      return true;
    })
  );

  const itemCount = results.filter(Boolean).length;

  // Mark slot as pushed
  await supabase
    .from(table)
    .update({ ingredients_pushed: true })
    .eq("id", slotId);

  if (errors.length > 0) {
    return NextResponse.json({
      success: false,
      itemCount,
      errors,
    });
  }

  return NextResponse.json({ success: true, itemCount });
}
