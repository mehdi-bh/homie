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
  "#c4623a", // terracotta
  "#ec4899", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // rouge
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
        <PageHeader title="Parametres" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-lg" />
            <div className="flex gap-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-lg" />
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
      <PageHeader title="Parametres" />

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom affiche</label>
          <input
            value={profile.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Couleur</label>
          <div className="flex gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-9 w-9 rounded-full transition-all active:scale-90",
                  profile.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                )}
                style={{ backgroundColor: c }}
                onClick={() => update("color", c)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo</label>
          <div className="flex items-center gap-4">
            <UserAvatar
              src={profile.avatar_url}
              fallback={profile.avatar_emoji}
              size="lg"
            />
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm font-semibold text-primary disabled:opacity-50 transition-all active:scale-95"
              >
                {uploading ? "Envoi..." : profile.avatar_url ? "Changer la photo" : "Ajouter une photo"}
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
                  className="block text-xs text-muted-foreground active:text-destructive transition-colors"
                >
                  Supprimer la photo
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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emoji (avatar par defaut)</label>
          <div className="flex gap-2 flex-wrap">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={cn(
                  "h-11 w-11 rounded-xl text-xl flex items-center justify-center transition-all active:scale-90",
                  profile.avatar_emoji === a
                    ? "bg-primary/10 ring-2 ring-primary scale-110"
                    : "bg-muted/50"
                )}
                onClick={() => update("avatar_emoji", a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lunch par defaut</label>
          <input
            value={profile.default_lunch || ""}
            onChange={(e) => update("default_lunch", e.target.value)}
            placeholder="Ex: Riz + poulet"
            className="w-full rounded-2xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] shadow-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notifications</label>

        <div className="flex items-center justify-between min-h-[44px]">
          <Label htmlFor="notify-daily" className="font-medium text-sm">Rappels quotidiens</Label>
          <Switch
            id="notify-daily"
            checked={profile.notify_daily}
            onCheckedChange={(v) => update("notify_daily", v)}
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <Label htmlFor="notify-deadline" className="font-medium text-sm">Alertes delais</Label>
          <Switch
            id="notify-deadline"
            checked={profile.notify_deadline}
            onCheckedChange={(v) => update("notify_deadline", v)}
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <Label htmlFor="notify-grocery" className="font-medium text-sm">Mises a jour courses</Label>
          <Switch
            id="notify-grocery"
            checked={profile.notify_grocery}
            onCheckedChange={(v) => update("notify_grocery", v)}
          />
        </div>

        <div className="flex items-center justify-between min-h-[44px]">
          <Label htmlFor="notify-chores" className="font-medium text-sm">Rappels taches menageres</Label>
          <Switch
            id="notify-chores"
            checked={profile.notify_chores}
            onCheckedChange={(v) => update("notify_chores", v)}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-50 transition-all active:scale-[0.98] min-h-[52px] shadow-sm"
      >
        {saved ? "Enregistre !" : saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
