"use client";

import { useState } from "react";
import { Menu, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NetWorthDisplay } from "./net-worth-display";
import { NotificationBell } from "./notification-bell";
import { GameTime } from "./game-time";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type TickerState = { running: boolean; gameTimeMs: number };

export function TopBar({
  user,
  netWorth,
  changePct,
  ticker,
}: {
  user: { username: string };
  netWorth: number;
  changePct: number;
  ticker: TickerState;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) toast.error(res.error);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-4">
      {/* Mobile menu button (placeholder — drawer menu can be added later) */}
      <button
        className="flex h-9 w-9 items-center justify-center rounded text-text-muted hover:bg-soft lg:hidden"
        aria-label="Menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <NetWorthDisplay initial={{ netWorth, changePct }} />

      <GameTime initialGameTimeMs={ticker.gameTimeMs} />

      <div className="flex-1" />

      <NotificationBell />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-muted hover:bg-soft"
        >
          <UserCircle className="h-5 w-5" />
          <span className="hidden text-xs font-medium sm:inline">{user.username}</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-10 z-40 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block rounded px-2 py-1.5 text-xs text-text hover:bg-soft"
              >
                Settings
              </Link>
              <button
                onClick={logout}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-loss hover:bg-loss-soft"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
