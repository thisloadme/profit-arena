"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PRIMARY_NAV } from "@/config/nav";

/**
 * Global keyboard shortcuts (DESIGN §5): press a nav shortcut key to jump.
 * Ignored when focus is in input/textarea/contenteditable.
 *
 * ponytail: single document listener; one router.push per match.
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      const key = e.key.toLowerCase();
      const item = PRIMARY_NAV.find((n) => n.shortcut === key);
      if (item) {
        e.preventDefault();
        router.push(item.href);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);
}
