"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { PRIMARY_NAV } from "@/config/nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-52 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-14 items-center px-4">
        <span className="text-sm font-bold tracking-tight text-primary">Finsim</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-soft font-medium text-primary"
                  : "text-text-muted hover:bg-soft hover:text-text",
              )}
              title={`${item.label} (${item.shortcut.toUpperCase()})`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
