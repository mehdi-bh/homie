import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ChoreManager } from "@/components/chores/chore-manager";

export default async function ManageChoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: choreDefs } = await supabase
    .from("chore_definitions")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_emoji, color")
    .order("display_name");

  return (
    <div className="space-y-6">
      <PageHeader title="Gérer les tâches" />
      <ChoreManager
        choreDefs={choreDefs ?? []}
        profiles={profiles ?? []}
      />
    </div>
  );
}
