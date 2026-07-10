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
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10">
      <header className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
          Global Ranking
        </p>
        <h1 className="mt-0.5 text-2xl font-bold text-text">Leaderboard</h1>
      </header>

      {/* Pill tabs */}
      <div className="mb-4 flex gap-1.5">
        {(["leaderboard", "achievements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              tab === t
                ? "bg-primary text-on-primary glow-primary"
                : "border border-border text-text-muted hover:bg-soft hover:text-text",
            )}
          >
            {t === "leaderboard" ? "Leaderboard" : "Achievements"}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div className="flex flex-col gap-1.5">
          {/* Search */}
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              placeholder="Search by username…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLeaderboard(search)}
              className="w-full rounded-full border border-border bg-card px-4 py-1.5 text-xs text-text outline-none ring-1 ring-transparent placeholder:text-text-faint transition-shadow focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => fetchLeaderboard(search)}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-on-primary transition-all hover:brightness-110"
            >
              Search
            </button>
          </div>

          {me && (
            <div className="glass-panel mb-1 flex items-center gap-3 border-l-2 border-l-accent p-3">
              <span className="tnum w-8 text-center text-sm font-bold text-accent">#{me.rank}</span>
              <span className="flex-1 text-sm font-medium text-text">{me.username} <span className="text-[10px] text-text-faint">(you)</span></span>
              <span className="tnum text-sm font-bold text-text"><Money value={me.netWorth} compact /></span>
            </div>
          )}
          {rows.map((r) => (
            <button
              key={r.userId}
              onClick={() => {
                apiFetch<{ user: PublicUser }>(`/api/users/${r.userId}`).then((res) => {
                  if (res.ok) setProfile(res.data.user);
                });
              }}
              className={cn(
                "glass-panel card-interactive flex items-center gap-3 p-3 text-left",
                me?.userId === r.userId && "border-l-2 border-l-accent",
                r.rank === 1 && "border-l-2 border-l-warning",
              )}
            >
              <span className={cn("tnum w-8 text-center text-sm font-bold", rankColor(r.rank))}>
                {r.rank <= 3 ? medal(r.rank) : `#${r.rank}`}
              </span>
              <span className="flex-1 text-sm text-text">{r.username}</span>
              <span className="tnum text-sm font-bold text-text"><Money value={r.netWorth} compact /></span>
            </button>
          ))}
          {rows.length === 0 && <p className="py-8 text-center text-xs text-text-faint">No leaderboard data yet.</p>}
        </div>
      )}

      {tab === "achievements" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {achievements.length === 0 ? (
            <p className="col-span-full py-8 text-center text-xs text-text-faint">No data yet.</p>
          ) : achievements.map((a) => (
            <div key={a.code} className={cn("glass-panel flex flex-col items-center gap-1 p-4 text-center", !a.earned && "opacity-40")}>
              <span className="text-2xl">{ACH_ICONS[a.iconKey] ?? "🏅"}</span>
              <span className="text-xs font-bold text-text">{a.name}</span>
              <span className="text-[10px] text-text-muted">{a.description}</span>
              {a.earned && a.unlockedAt && (
                <span className="tnum text-[9px] text-text-faint">{new Date(a.unlockedAt).toLocaleDateString("en-US")}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Profile modal */}
      {profile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setProfile(null)}
        >
          <div className="glass-panel mx-auto w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-text">{profile.username}</h2>
              <button
                onClick={() => setProfile(null)}
                className="rounded-md p-1 text-text-muted transition-colors hover:bg-soft hover:text-text"
                aria-label="Close"
              >
                &times;
              </button>
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

function medal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function rankColor(rank: number): string {
  if (rank <= 3) return "text-warning";
  return "text-text-faint";
}
