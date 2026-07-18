"use client";

import { useState } from "react";
import { Menu, UserCircle, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NetWorthDisplay } from "./net-worth-display";
import { NotificationBell } from "./notification-bell";
import { GameTime } from "./game-time";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { PRIMARY_NAV } from "@/config/nav";
import { cn } from "@/lib/cn";
import logoNoBg from "@/assets/marketarena_logo_nobg.png";

type TickerState = { running: boolean; gameTimeMs: number };

export function TopBar({
  user,
  netWorth,
  cash,
  changePct,
  ticker,
}: {
  user: { username: string };
  netWorth: number;
  cash: number;
  changePct: number;
  ticker: TickerState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Track which pathname the drawer was opened on; it auto-closes on any
  // navigation by deriving visibility from a comparison, no effect needed.
  const [navOpenPath, setNavOpenPath] = useState<string | null>(null);
  const navOpen = navOpenPath !== null && navOpenPath === pathname;

  function openNav() { setNavOpenPath(pathname); }
  function closeNav() { setNavOpenPath(null); }

  async function logout() {
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    if (!res.ok) toast.error(res.error);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass-panel sticky top-0 z-20 flex h-16 items-center gap-3 rounded-none border-b border-border px-3 sm:px-4">
      {/* Mobile nav drawer toggle */}
      <button
        onClick={openNav}
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-soft hover:text-text lg:hidden"
        aria-label="Open navigation"
        aria-expanded={navOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      <GameTime initialGameTimeMs={ticker.gameTimeMs} />

      <div className="flex-1" />

      <NetWorthDisplay initial={{ netWorth, changePct, cash }} />

      <NotificationBell />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm text-text-muted transition-colors hover:bg-soft hover:text-text"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-xs font-medium sm:inline">{user.username}</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
            <div
              role="menu"
              className="glass-panel absolute right-0 top-12 z-40 w-56 overflow-hidden p-1.5"
            >
              {/* User header */}
              <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-text">{user.username}</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-faint">Account</span>
                </div>
              </div>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text transition-colors hover:bg-soft"
              >
                <UserCircle className="h-3.5 w-3.5 text-text-muted" />
                Settings
              </Link>
              <button
                onClick={logout}
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-loss transition-colors hover:bg-loss-soft"
              >
                <span aria-hidden className="text-sm leading-none">⏻</span>
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {navOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeNav}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
            <motion.nav
              className="glass-panel absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-2.5">
                  <Image
                    src={logoNoBg}
                    alt="Market Arena"
                    width={28}
                    height={28}
                    className="h-7 w-7"
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-bold tracking-tight text-primary">Market Arena</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-text-faint">Financial Simulation Arena</span>
                  </div>
                </div>
                <button
                  onClick={closeNav}
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-soft hover:text-text"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
                {PRIMARY_NAV.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-surface-highest font-medium text-primary"
                          : "text-text-muted hover:bg-soft hover:text-text",
                      )}
                    >
                      {active && (
                        <span aria-hidden className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
