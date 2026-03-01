import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Archive all checked items
  const { count } = await supabase
    .from("grocery_items")
    .update({ archived: true })
    .eq("checked", true)
    .eq("archived", false);

  return NextResponse.json({ success: true, archivedCount: count ?? 0 });
}
