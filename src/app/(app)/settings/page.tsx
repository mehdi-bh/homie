"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
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

const AVATARS = ["\u{1F468}\u200D\u{1F4BB}", "\u{1F469}\u200D\u{1F3A8}", "\u{1F9D1}\u200D\u{1F3A4}", "\u{1F3E0}", "\u{1F373}", "\u{1F3AE}", "\u{1F308}", "\u{1F431}"];

interface Profile {
  display_name: string;
  color: string;
  avatar_emoji: string;
  avatar_url: string | null;
  default_lunch: string;
  notify_daily: boolean;
  notify_deadline: boolean;
  notify_grocery: boolean;
  notify_chores: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("display_name, color, avatar_emoji, avatar_url, default_lunch, notify_daily, notify_deadline, notify_grocery, notify_chores")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    }
    load();
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    const supabase = createClient();
    const path = `${userId}.jpg`;

    await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    setProfile((p) => (p ? { ...p, avatar_url: avatarUrl } : p));
    setUploading(false);
  }

  async function handleSave() {
    if (!profile || !userId) return;
    setSaving(true);

    const supabase = createClient();
    const { avatar_url: _, ...profileData } = profile;

    await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

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
          <Label>Photo</Label>
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile.avatar_url}
              fallback={profile.avatar_emoji}
              size="lg"
            />
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading..." : profile.avatar_url ? "Change photo" : "Upload photo"}
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!userId) return;
                    const supabase = createClient();
                    await supabase.storage.from("avatars").remove([`${userId}.jpg`]);
                    await supabase
                      .from("profiles")
                      .update({ avatar_url: null })
                      .eq("id", userId);
                    setProfile((p) => (p ? { ...p, avatar_url: null } : p));
                  }}
                  className="block text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Avatar emoji (fallback)</Label>
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
