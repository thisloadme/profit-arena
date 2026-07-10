"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_COOKIE, type Theme } from "@/components/theme-script";

/**
 * Client-side theme toggle. Reads initial theme from the DOM class that the
 * pre-hydration script (theme-script.tsx) already applied to <html>, so the
 * first client render matches the server without a setState-in-effect.
 * Toggles write a cookie (for next navigation's SSR) and flip the class
 * on documentElement for instant visual feedback.
 */
function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function ThemeToggle({ className }: { className?: string }) {
  // Lazy initializer reads from the DOM once on the client; on the server it
  // returns "dark" (the default), which matches the script's fallback.
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const el = document.documentElement;
    el.classList.remove("dark", "light");
    el.classList.add(next);
    el.style.colorScheme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Current: ${theme} mode. Click to switch.`}
      // suppressHydrationWarning: server renders the dark icon (default),
      // client may render light if the cookie says so — cosmetic mismatch only.
      suppressHydrationWarning
      className={cn(
        "rounded-md p-2 text-text-muted transition-colors hover:bg-soft hover:text-text focus-ring",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
