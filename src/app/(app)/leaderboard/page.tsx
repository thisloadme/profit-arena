"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { apiFetch } from "@/lib/api-client";

type Row = { rank: number; userId: string; username: string; netWorth: number; totalAssets: number };
type Achievement = { code: string; name: string; description: string; iconKey: string; earned: boolean; unlockedAt: string | null };

const ACH_ICONS: Record<string, string> = {
  "shopping-cart": "🛒", trophy: "🏆", shield: "🛡️", "pie-chart": "📊",
  "check-circle": "✅", store: "🏪", bitcoin: "₿", "hand-coins": "🤝", "hand-heart": "💝",
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"leaderboard" | "achievements">("leaderboard");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    apiFetch<{ rows: Row[]; me: Row | null }>("/api/leaderboard").then((r) => {
      if (r.ok) { setRows(r.data.rows); setMe(r.data.me); }
    });
    apiFetch<{ achievements: Achievement[] }>("/api/achievements").then((r) => {
      if (r.ok) setAchievements(r.data.achievements);
    });
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-bold text-primary">Leaderboard</h1>
      </header>

      <div className="flex gap-1 rounded border border-border p-0.5">
        {(["leaderboard", "achievements"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded px-3 py-1.5 text-xs font-medium", tab === t ? "bg-primary text-white" : "text-text-muted hover:bg-soft")}>
            {t === "leaderboard" ? "Leaderboard" : "Achievements"}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div className="flex flex-col gap-1">
          {me && (
            <div className="card-compact mb-2 flex items-center gap-3 border-accent/30 bg-info-soft">
              <span className="tnum w-8 text-center text-sm font-bold text-text-muted">#{me.rank}</span>
              <span className="flex-1 text-sm font-medium text-text">{me.username}</span>
              <span className="tnum text-sm font-semibold text-text"><Money value={me.netWorth} compact /></span>
            </div>
          )}
          {rows.map((r) => (
            <div key={r.userId} className={cn("card-compact flex items-center gap-3 py-2", me?.userId === r.userId && "ring-1 ring-accent")}>
              <span className={cn("tnum w-8 text-center text-sm font-bold", rankColor(r.rank))}>#{r.rank}</span>
              <span className="flex-1 text-sm text-text">{r.username}</span>
              <span className="tnum text-sm font-semibold text-text"><Money value={r.netWorth} compact /></span>
            </div>
          ))}
          {rows.length === 0 && <p className="py-8 text-center text-xs text-text-faint">No leaderboard data yet.</p>}
        </div>
      )}

      {tab === "achievements" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {achievements.length === 0 ? (
            <p className="col-span-full py-8 text-center text-xs text-text-faint">No data yet.</p>
          ) : achievements.map((a) => (
            <div key={a.code} className={cn("card-compact flex flex-col items-center gap-1 py-4 text-center", !a.earned && "opacity-40")}>
              <span className="text-2xl">{ACH_ICONS[a.iconKey] ?? "🏅"}</span>
              <span className="text-xs font-medium text-text">{a.name}</span>
              <span className="text-[10px] text-text-muted">{a.description}</span>
              {a.earned && a.unlockedAt && (
                <span className="text-[9px] text-text-faint">{new Date(a.unlockedAt).toLocaleDateString("en-US")}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function rankColor(rank: number): string {
  if (rank === 1) return "text-warning";
  if (rank <= 3) return "text-text-muted";
  return "text-text-faint";
}
