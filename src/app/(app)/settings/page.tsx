"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

const RISK_OPTIONS = [
  { value: "CONSERVATIVE", label: "Conservative" },
  { value: "MODERATE", label: "Moderate" },
  { value: "AGGRESSIVE", label: "Aggressive" },
] as const;

type Profile = {
  username: string;
  email: string;
  riskProfile: string;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [riskProfile, setRiskProfile] = useState("MODERATE");

  useEffect(() => {
    apiFetch<Profile>("/api/profile", { method: "GET" }).then((r) => {
      if (r.ok && r.data) {
        setProfile(r.data);
        setBio(r.data.bio ?? "");
        setLocation(r.data.location ?? "");
        setRiskProfile(r.data.riskProfile);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const r = await apiFetch("/api/profile", {
      method: "PATCH",
      body: { bio, location, riskProfile },
    });
    setSaving(false);
    if (r.ok) { toast.success("Settings saved"); router.refresh(); }
    else toast.error(r.error);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Profile
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-text">Settings</h1>
      </header>

      <div className="glass-panel flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username">
            <div className="flex h-9 items-center rounded-md border border-border bg-surface-lowest/60 px-3 text-sm text-text-muted">
              {profile?.username}
            </div>
          </Field>
          <Field label="Email">
            <div className="flex h-9 items-center rounded-md border border-border bg-surface-lowest/60 px-3 text-sm text-text-muted">
              {profile?.email}
            </div>
          </Field>
        </div>

        <Field label="Bio" hint="Max 280 characters">
          <Input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            maxLength={280}
          />
        </Field>

        <Field label="Location">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            maxLength={100}
          />
        </Field>

        <Field label="Risk Profile">
          <select
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface-lowest/60 px-3 text-sm text-text outline-none focus-ring"
          >
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Button onClick={save} loading={saving} className="mt-2 glow-primary">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
