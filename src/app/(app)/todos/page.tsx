import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TodoList } from "@/components/todos/todo-list";

export default async function TodosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: todos }, { data: profiles }] = await Promise.all([
    supabase
      .from("todos")
      .select("id, title, note, created_by, completed, completed_at, priority, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, display_name, avatar_emoji, avatar_url"),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="A faire" />
      <TodoList
        todos={todos ?? []}
        profiles={profiles ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
