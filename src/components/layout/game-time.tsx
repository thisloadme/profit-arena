"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatGameTimeRich } from "@/config/game";

type Props = {
  initialGameTimeMs: number;
};

/**
 * Game time clock — rich label (e.g. "Mon, W1 Jul, 22:10") based on
 * server-provided game time. Polls the server periodically to stay in sync.
 * All players see the same game time (server-authoritative).
 *
 * polling every 5s is fine for MVP. WebSocket push would reduce
 * lag, but the tick interval is also 5s so polling aligns naturally.
 */
export function GameTime({ initialGameTimeMs }: Props) {
  // Derive the initial display from the prop — no setState in the effect body.
  const [display, setDisplay] = useState(() => formatGameTimeRich(initialGameTimeMs));

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/simulation/speed", { cache: "no-store" });
        const data = await res.json();
        if (data.gameTimeMs !== undefined) setDisplay(formatGameTimeRich(data.gameTimeMs));
      } catch {
        // ignore — server might be restarting
      }
    }, 5_000);

    return () => clearInterval(id);
  }, [initialGameTimeMs]);

  if (!display) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-text-muted">
      <Clock className="h-3.5 w-3.5" />
      <span className="tnum">{display}</span>
    </div>
  );
}
