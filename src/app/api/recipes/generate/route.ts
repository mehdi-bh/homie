import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un assistant culinaire. L'utilisateur decrit un plat et tu generes une recette structuree.

Regles:
- Quantites PAR PERSONNE pour de GROS MANGEURS: pates 150g, riz 100g, pommes de terre 300g, viande/poisson 250-300g, legumes 150-200g
- Utilise des quantites faciles a acheter en magasin: prefere 1 pot, 1 brique, 1 boite, 200ml, 250g plutot que 37g ou 183ml. Arrondis toujours vers le format du commerce le plus proche.
- Ne pas inclure sel, poivre, huile d'olive (ce sont des basiques)
- Nom de recette court et clair
- Notes optionnelles (astuces de cuisson, variantes)

Categories exactes: legumes, viandes, produits_laitiers, epicerie, boissons, autre
Unites exactes: g, kg, ml, L, unite, c. a soupe, c. a cafe
scaling_type: "per_person" pour la plupart, "fixed" pour les pots/bocaux/conserves`;

const TOOL_DEF: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_recipe",
    description: "Create a structured recipe with ingredients",
    parameters: {
      type: "object",
      required: ["name", "ingredients"],
      properties: {
        name: { type: "string", description: "Short recipe name" },
        notes: { type: "string", description: "Optional cooking notes" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            required: ["name", "quantity", "unit", "scaling_type", "category"],
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string", enum: ["g", "kg", "ml", "L", "unite", "c. a soupe", "c. a cafe"] },
              scaling_type: { type: "string", enum: ["per_person", "fixed"] },
              category: { type: "string", enum: ["legumes", "viandes", "produits_laitiers", "epicerie", "boissons", "autre"] },
            },
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages requis" }, { status: 400 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      tools: [TOOL_DEF],
      tool_choice: { type: "function", function: { name: "create_recipe" } },
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== "function") {
      return NextResponse.json({ error: "Pas de reponse structuree" }, { status: 500 });
    }

    const result = JSON.parse((toolCall as { type: "function"; function: { arguments: string } }).function.arguments);

    return NextResponse.json({
      name: result.name,
      notes: result.notes || "",
      ingredients: result.ingredients,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
