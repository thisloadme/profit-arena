"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { apiFetch } from "@/lib/api-client";

// ---- Types ----
type GlobalRow = { rank: number; userId: string; username: string; netWorth: number; totalAssets: number };
type WeeklyRow = { rank: number; userId: string; username: string; gain: number; netWorth: number };
type Row = GlobalRow | WeeklyRow;

type Achievement = { code: string; name: string; description: string; iconKey: string; earned: boolean; unlockedAt: string | null };
type PublicUser = {
  id: string; username: string; netWorth: number; totalAssets: number;
  totalDebt: number; cash: number; createdAt: string;
  profile: { avatarUrl: string | null; bio: string | null; location: string | null } | null;
};
type Summary = { totalPlayers: number; totalWealth: number; yourPercentile: number | null };

const ACH_ICONS: Record<string, string> = {
  "shopping-cart": "🛒", trophy: "🏆", shield: "🛡️", "pie-chart": "📊",
  "check-circle": "✅", store: "🏪", bitcoin: "₿", "hand-coins": "🤝", "hand-heart": "💝",
};

/** Rank title by net worth — mirrors Stitch "Grandmaster / Silver / Bronze" hierarchy. */
function rankTitle(netWorth: number): string {
  if (netWorth >= 1_000_000_000) return "Grandmaster";
  if (netWorth >= 100_000_000) return "Master";
  if (netWorth >= 10_000_000) return "Pro Trader";
  if (netWorth >= 1_000_000) return "Trader";
  return "Rookie";
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_ACCENT = [
  "border-warning/50 glow-primary",   // 1st — amber border + emerald glow
  "border-text-faint/40",             // 2nd
  "border-text-faint/40",             // 3rd
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"global" | "weekly">("global");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Row | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async (q: string, p: "global" | "weekly") => {
    const params = new URLSearchParams({ period: p });
    if (q) params.set("search", q);
    const r = await apiFetch<{ rows: Row[]; me: Row | null; summary: Summary }>(
      `/api/leaderboard?${params}`,
    );
    if (r.ok) {
      setRows(r.data.rows);
      setMe(r.data.me);
      setSummary(r.data.summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ period });
    apiFetch<{ rows: Row[]; me: Row | null; summary: Summary }>(
      `/api/leaderboard?${params}`,
    ).then((r) => {
      if (cancelled || !r.ok) return;
      setRows(r.data.rows);
      setMe(r.data.me);
      setSummary(r.data.summary);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [period]);

  useEffect(() => {
    apiFetch<{ achievements: Achievement[] }>("/api/achievements").then((r) => {
      if (r.ok) setAchievements(r.data.achievements);
    });
  }, []);

  const openProfile = (userId: string) => {
    apiFetch<{ user: PublicUser }>(`/api/users/${userId}`).then((res) => {
      if (res.ok) setProfile(res.data.user);
    });
  };

  const isWeekly = period === "weekly";
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Podium order: 2nd, 1st, 3rd (1st elevated in center).
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-10">
      {/* ===== Header + summary strip ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Global Ranking
          </p>
          <h1 className="text-2xl font-black tracking-tight text-text">Leaderboard</h1>
        </div>
        {summary && (
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-text-faint">Players</p>
              <p className="tnum text-sm font-bold text-text">{summary.totalPlayers.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-text-faint">Total Wealth</p>
              <p className="tnum text-sm font-bold text-primary">
                <Money value={summary.totalWealth} compact />
              </p>
            </div>
            {summary.yourPercentile != null && (
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-text-faint">Your Percentile</p>
                <p className="tnum text-sm font-bold text-accent">Top {100 - summary.yourPercentile}%</p>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ===== Top-3 Podium (Stitch layout) ===== */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
          {podiumOrder.map((r) => {
            const realRank = r.rank; // 1, 2, or 3
            const isWinner = realRank === 1;
            const isWeeklyRow = "gain" in r;
            const value = isWeeklyRow ? r.gain : r.netWorth;
            return (
              <button
                key={r.userId}
                onClick={() => openProfile(r.userId)}
                className={cn(
                  "glass-panel card-interactive relative flex flex-col items-center gap-1.5 p-3 text-center sm:p-4",
                  "border-t-2",
                  PODIUM_ACCENT[realRank - 1],
                  isWinner && "-translate-y-2 sm:-translate-y-3",
                )}
              >
                <span className="text-2xl sm:text-3xl">{MEDAL[realRank - 1]}</span>
                <span className="max-w-full truncate text-xs font-bold text-text sm:text-sm">
                  {r.username}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-text-faint">
                  {!isWeeklyRow && rankTitle((r as GlobalRow).netWorth)}
                  {isWeeklyRow && "Weekly Riser"}
                </span>
                <span className={cn("tnum text-sm font-black sm:text-base", isWinner ? "text-warning" : "text-text")}>
                  <Money value={value} compact signed={isWeeklyRow} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== Tabs: Global | Weekly + search ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {(["global", "weekly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setLoading(true); }}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all",
                period === p
                  ? "bg-primary text-on-primary glow-primary"
                  : "border border-border text-text-muted hover:bg-soft hover:text-text",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex w-full gap-1.5 sm:w-64">
          <input
            type="text"
            placeholder="Search player…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeaderboard(search, period)}
            className="w-full rounded-full border border-border bg-card px-3 py-1.5 text-xs text-text outline-none ring-1 ring-transparent placeholder:text-text-faint transition-shadow focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => fetchLeaderboard(search, period)}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary transition-all hover:brightness-110"
          >
            Go
          </button>
        </div>
      </div>

      {/* ===== Dense rank list (4+) ===== */}
      <div className="flex flex-col gap-1">
        {loading ? (
          <p className="py-6 text-center text-xs text-text-faint">Loading…</p>
        ) : rest.length === 0 ? (
          <p className="py-6 text-center text-xs text-text-faint">No more entries.</p>
        ) : (
          rest.map((r) => {
            const isMe = me?.userId === r.userId;
            const isWeeklyRow = "gain" in r;
            const value = isWeeklyRow ? r.gain : r.netWorth;
            const positive = isWeeklyRow ? r.gain >= 0 : true;
            return (
              <button
                key={r.userId}
                onClick={() => openProfile(r.userId)}
                className={cn(
                  "glass-panel card-interactive flex items-center gap-3 px-3 py-2 text-left",
                  isMe && "border-l-2 border-l-accent",
                )}
              >
                <span className="tnum w-7 text-center text-xs font-bold text-text-faint">
                  {r.rank}
                </span>
                {/* Trend arrow — placeholder static for global, gain-based for weekly */}
                <span className="text-text-faint">
                  {isWeeklyRow ? (
                    r.gain > 0 ? "▲" : r.gain < 0 ? "▼" : "■"
                  ) : (
                    <span className="text-text-faint">●</span>
                  )}
                </span>
                <span className={cn("flex-1 truncate text-xs font-medium", isMe ? "text-accent" : "text-text")}>
                  {r.username}
                  {isMe && <span className="ml-1 text-[10px] text-text-faint">(you)</span>}
                </span>
                {isWeeklyRow && (
                  <span className={cn("tnum text-[10px] font-semibold", positive ? "text-profit" : "text-loss")}>
                    {r.gain > 0 ? "+" : ""}<Money value={r.gain} compact />
                  </span>
                )}
                <span className={cn("tnum text-xs font-bold", isWeeklyRow ? "text-text-muted" : "text-text")}>
                  <Money value={value} compact />
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* ===== Achievement section (preserved, same glass feel) ===== */}
      <section className="mt-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Achievements
          </h2>
          <span className="tnum text-[10px] text-text-faint">
            {achievements.filter((a) => a.earned).length}/{achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {achievements.length === 0 ? (
            <p className="col-span-full py-4 text-center text-xs text-text-faint">No achievements yet.</p>
          ) : achievements.map((a) => (
            <div
              key={a.code}
              title={a.description}
              className={cn(
                "glass-panel flex flex-col items-center gap-1 p-2.5 text-center transition-all",
                a.earned ? "glow-primary" : "opacity-30 grayscale",
              )}
            >
              <span className="text-xl">{ACH_ICONS[a.iconKey] ?? "🏅"}</span>
              <span className="line-clamp-1 text-[10px] font-bold text-text">{a.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Sticky "Your Rank" bar (Stitch signature) ===== */}
      {me && (
        <div className="sticky bottom-2 z-30 mt-1">
          <div className="glass-panel flex items-center gap-3 border-l-2 border-l-accent px-4 py-2.5 shadow-raised">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-text-faint">
              Your Rank
            </span>
            <span className="tnum text-sm font-black text-accent">#{me.rank}</span>
            <span className="h-3 w-px bg-border" />
            <span className="flex-1 truncate text-xs font-medium text-text">
              {me.username}
              {isWeekly && "gain" in me && (
                <span className={cn("tnum ml-2 font-bold", me.gain >= 0 ? "text-profit" : "text-loss")}>
                  {me.gain > 0 ? "+" : ""}<Money value={me.gain} compact />/wk
                </span>
              )}
            </span>
            <span className="tnum text-sm font-bold text-text">
              <Money value={"gain" in me ? me.netWorth : me.netWorth} compact />
            </span>
          </div>
        </div>
      )}

      {/* ===== Profile modal ===== */}
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
