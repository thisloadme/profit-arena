"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { apiFetch } from "@/lib/api-client";

type Row = { rank: number; userId: string; username: string; netWorth: number; totalAssets: number };
type Achievement = { code: string; name: string; description: string; iconKey: string; earned: boolean; unlockedAt: string | null };
type PublicUser = {
  id: string; username: string; netWorth: number; totalAssets: number;
  totalDebt: number; cash: number; createdAt: string;
  profile: { avatarUrl: string | null; bio: string | null; location: string | null } | null;
};

const ACH_ICONS: Record<string, string> = {
  "shopping-cart": "🛒", trophy: "🏆", shield: "🛡️", "pie-chart": "📊",
  "check-circle": "✅", store: "🏪", bitcoin: "₿", "hand-coins": "🤝", "hand-heart": "💝",
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"leaderboard" | "achievements">("leaderboard");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<PublicUser | null>(null);

  const fetchLeaderboard = useCallback(async (q: string) => {
    const params = q ? `?search=${encodeURIComponent(q)}` : "";
    const r = await apiFetch<{ rows: Row[]; me: Row | null }>(`/api/leaderboard${params}`);
    if (r.ok) { setRows(r.data.rows); setMe(r.data.me); }
  }, []);

  useEffect(() => {
    fetchLeaderboard(search);
    apiFetch<{ achievements: Achievement[] }>("/api/achievements").then((r) => {
      if (r.ok) setAchievements(r.data.achievements);
    });
  }, []); // initial fetch only; search is manual via button/enter

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
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
          {/* Search */}
          <div className="mb-1 flex gap-2">
            <input
              type="text"
              placeholder="Search by username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLeaderboard(search)}
              className="w-full rounded border border-border bg-card px-3 py-1.5 text-xs text-text outline-none placeholder:text-text-faint focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={() => fetchLeaderboard(search)}
              className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white"
            >
              Search
            </button>
          </div>

          {me && (
            <div className="card-compact mb-2 flex items-center gap-3 border-accent/30 bg-info-soft">
              <span className="tnum w-8 text-center text-sm font-bold text-text-muted">#{me.rank}</span>
              <span className="flex-1 text-sm font-medium text-text">{me.username}</span>
              <span className="tnum text-sm font-semibold text-text"><Money value={me.netWorth} compact /></span>
            </div>
          )}
          {rows.map((r) => (
            <button key={r.userId} onClick={() => {
              apiFetch<{ user: PublicUser }>(`/api/users/${r.userId}`).then((res) => {
                if (res.ok) setProfile(res.data.user);
              });
            }}
              className={cn("card-compact flex items-center gap-3 py-2 text-left hover:border-border-strong", me?.userId === r.userId && "ring-1 ring-accent")}>
              <span className={cn("tnum w-8 text-center text-sm font-bold", rankColor(r.rank))}>#{r.rank}</span>
              <span className="flex-1 text-sm text-text">{r.username}</span>
              <span className="tnum text-sm font-semibold text-text"><Money value={r.netWorth} compact /></span>
            </button>
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

      {/* Profile modal */}
      {profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setProfile(null)}>
          <div className="card-compact mx-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-text">{profile.username}</h2>
              <button onClick={() => setProfile(null)} className="text-xs text-text-muted hover:text-text" aria-label="Close">&times;</button>
            </div>
            {profile.profile?.avatarUrl && (
              <img src={profile.profile.avatarUrl} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" />
            )}
            {profile.profile?.bio && <p className="mb-2 text-xs text-text-muted">{profile.profile.bio}</p>}
            {profile.profile?.location && <p className="mb-2 text-xs text-text-faint">📍 {profile.profile.location}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-text-faint">Net Worth</span><br /><span className="tnum font-semibold text-text"><Money value={profile.netWorth} compact /></span></div>
              <div><span className="text-text-faint">Cash</span><br /><span className="tnum font-semibold text-text"><Money value={profile.cash} compact /></span></div>
              <div><span className="text-text-faint">Total Assets</span><br /><span className="tnum font-semibold text-text"><Money value={profile.totalAssets} compact /></span></div>
              <div><span className="text-text-faint">Total Debt</span><br /><span className="tnum font-semibold text-loss"><Money value={profile.totalDebt} compact /></span></div>
            </div>
            <p className="mt-3 text-[10px] text-text-faint">Member since {new Date(profile.createdAt).toLocaleDateString("en-US")}</p>
          </div>
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
