"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const COLORS = [
  "#4f46e5", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
];

const AVATARS = ["👨‍💻", "👩‍🎨", "🧑‍🎤", "🏠", "🍳", "🎮", "🌈", "🐱"];

interface Profile {
  display_name: string;
  color: string;
  avatar_emoji: string;
  default_lunch: string;
  notify_daily: boolean;
  notify_deadline: boolean;
  notify_grocery: boolean;
  notify_chores: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("display_name, color, avatar_emoji, default_lunch, notify_daily, notify_deadline, notify_grocery, notify_chores")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    }
    load();
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update(profile)
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) return null;

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={profile.display_name}
            onChange={(e) => update("display_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-8 w-8 rounded-full transition-all",
                  profile.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                )}
                style={{ backgroundColor: c }}
                onClick={() => update("color", c)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Avatar</Label>
          <div className="flex gap-2 flex-wrap">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={cn(
                  "h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all",
                  profile.avatar_emoji === a
                    ? "bg-primary/10 ring-2 ring-primary scale-110"
                    : "bg-muted hover:bg-muted/80"
                )}
                onClick={() => update("avatar_emoji", a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lunch">Default lunch</Label>
          <Input
            id="lunch"
            value={profile.default_lunch || ""}
            onChange={(e) => update("default_lunch", e.target.value)}
            placeholder="e.g. Riz + poulet"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-base font-semibold">Notifications</Label>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify-daily" className="font-normal">Daily reminders</Label>
          <Switch
            id="notify-daily"
            checked={profile.notify_daily}
            onCheckedChange={(v) => update("notify_daily", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify-deadline" className="font-normal">Deadline alerts</Label>
          <Switch
            id="notify-deadline"
            checked={profile.notify_deadline}
            onCheckedChange={(v) => update("notify_deadline", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify-grocery" className="font-normal">Grocery updates</Label>
          <Switch
            id="notify-grocery"
            checked={profile.notify_grocery}
            onCheckedChange={(v) => update("notify_grocery", v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="notify-chores" className="font-normal">Chore reminders</Label>
          <Switch
            id="notify-chores"
            checked={profile.notify_chores}
            onCheckedChange={(v) => update("notify_chores", v)}
          />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {saved ? "Saved!" : saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
