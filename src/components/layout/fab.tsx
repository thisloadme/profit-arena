"use client";

import { useState } from "react";
import { Plus, ShoppingCart, Store, HandCoins, Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";

type Action = { label: string; icon: typeof Plus; href: string; soon?: boolean };

const ACTIONS: Action[] = [
  { label: "Buy asset", icon: ShoppingCart, href: "/market", soon: true },
  { label: "Start business", icon: Store, href: "/business", soon: true },
  { label: "Take loan", icon: HandCoins, href: "/lending", soon: true },
  { label: "Find job", icon: Briefcase, href: "/jobs", soon: true },
];

export function FloatingActions() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-[72px] right-4 z-30 flex flex-col items-end gap-2 md:hidden">
      {ACTIONS.map((a, i) => {
        const Icon = a.icon;
        return (
          <a
            key={a.label}
            href={a.href}
            tabIndex={open ? 0 : -1}
            className={cn(
              "flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-3 text-xs shadow-md transition-all",
              open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
            )}
            style={{ transitionDelay: open ? `${i * 30}ms` : "0ms" }}
            aria-hidden={!open}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-soft">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </span>
            {a.label}
            {a.soon && (
              <span className="rounded bg-soft px-1 py-0.5 text-[9px] uppercase text-text-muted">soon</span>
            )}
          </a>
        );
      })}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform",
          open && "rotate-45",
        )}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
