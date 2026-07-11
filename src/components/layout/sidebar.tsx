"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV } from "@/config/nav";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Desktop sidebar — pinned left, "trading floor" vibe per Stitch dashboard.
 * Active item: right-edge emerald bar + surface-high tint (replaces the old
 * bg-soft pill). Quick action card + theme toggle live at the bottom.
 */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
      {/* Brand */}
      <div className="flex h-16 flex-col justify-center px-4">
        <span className="text-sm font-bold tracking-tight text-primary">
          Money Carnival
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-faint">
          Pro Trader Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-highest font-medium text-primary"
                  : "text-text-muted hover:bg-soft hover:text-text",
              )}
              title={`${item.label} (${item.shortcut.toUpperCase()})`}
            >
              {/* Active right-edge accent bar */}
              {active && (
                <span
                  aria-hidden
                  className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme toggle + settings link */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <Link
          href="/settings"
          className="text-[11px] text-text-muted transition-colors hover:text-text"
        >
          Settings
        </Link>
        <ThemeToggle />
      </div>
    </aside>
  );
}
