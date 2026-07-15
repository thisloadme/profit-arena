"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pin, PinOff, Wallet, PiggyBank, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  FINANCIAL_STATUS_LABELS,
  LIVING_EXPENSE_BY_STATUS,
  type FinancialStatusKey,
} from "@/config/game";

const STATUS_ORDER: FinancialStatusKey[] = ["STRUGGLING", "STABLE", "COMFORTABLE", "WEALTHY"];

// ponytail: visual icon + color per tier, co-located so the row reads at a glance.
const STATUS_META: Record<
  FinancialStatusKey,
  { icon: typeof Wallet; ring: string; badge: string }
> = {
  STRUGGLING:  { icon: Wallet,     ring: "ring-loss/40",    badge: "text-loss bg-loss/10" },
  STABLE:      { icon: PiggyBank,  ring: "ring-primary/40", badge: "text-primary bg-primary/10" },
  COMFORTABLE: { icon: Coins,      ring: "ring-warning/40", badge: "text-warning bg-warning/10" },
  WEALTHY:     { icon: Sparkles,   ring: "ring-accent/40",  badge: "text-accent bg-accent/10" },
};

type Profile = {
  username: string;
  email: string;
  financialStatus: FinancialStatusKey;
  financialStatusManual: boolean;
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
  const [financialStatus, setFinancialStatus] = useState<FinancialStatusKey>("STABLE");
  const [manual, setManual] = useState(false);

  useEffect(() => {
    apiFetch<Profile>("/api/profile", { method: "GET" }).then((r) => {
      if (r.ok && r.data) {
        setProfile(r.data);
        setBio(r.data.bio ?? "");
        setLocation(r.data.location ?? "");
        setFinancialStatus(r.data.financialStatus);
        setManual(r.data.financialStatusManual);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const r = await apiFetch("/api/profile", {
      method: "PATCH",
      body: { bio, location, financialStatus, financialStatusManual: manual },
    });
    setSaving(false);
    if (r.ok) { toast.success("Settings saved"); router.refresh(); }
    else toast.error(r.error);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  // When status is auto-controlled, surface the live computed value as a
  // preview so the user sees what the engine will pick. Only effective when
  // the displayed value differs from whatever the engine would pick — i.e.
  // after a manual override drift.
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Profile
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-text">Settings</h1>
      </header>

      <div className="glass-panel flex flex-col gap-5 p-5">
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

        {/* ===== Financial Status ===== */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-text">Financial Status</span>
            <button
              type="button"
              role="switch"
              aria-checked={manual}
              onClick={() => setManual((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors",
                manual
                  ? "bg-accent/15 text-accent hover:bg-accent/25"
                  : "bg-surface-highest text-text-muted hover:text-text",
              )}
            >
              {manual ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
              {manual ? "Pinned" : "Auto"}
            </button>
          </div>

          <div
            role="radiogroup"
            aria-label="Financial status"
            className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
          >
            {STATUS_ORDER.map((key) => {
              const meta = STATUS_META[key];
              const Icon = meta.icon;
              const info = FINANCIAL_STATUS_LABELS[key];
              const selected = financialStatus === key;
              const expense = LIVING_EXPENSE_BY_STATUS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFinancialStatus(key)}
                  className={cn(
                    "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selected
                      ? cn("border-transparent bg-card ring-2", meta.ring, "shadow-raised")
                      : "border-border bg-surface-lowest/40 hover:border-border hover:bg-surface-lowest/70",
                    !manual && "cursor-default",
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", meta.badge)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-text">{info.label}</span>
                    <span className="tnum text-[10px] font-medium text-text-faint">
                      ${expense}/tick
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected status: full description + auto-mode disclaimer */}
          <div className="mt-3 rounded-md border border-border bg-surface-lowest/40 p-3">
            <p className="text-xs leading-relaxed text-text-muted">
              {FINANCIAL_STATUS_LABELS[financialStatus].description}
            </p>
            {!manual && (
              <p className="mt-1.5 text-[10px] uppercase tracking-widest text-text-faint">
                Auto-recomputes from your net worth each tick.
              </p>
            )}
          </div>
        </div>

        <Button onClick={save} loading={saving} className="mt-1 glow-primary">
          Save Settings
        </Button>
      </div>
    </div>
  );
}