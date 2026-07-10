"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

type Props = {
  initialGameTimeMs: number;
};

/**
 * Game time clock — displays HH:MM based on server-provided game time.
 * Polls the server periodically to stay in sync.
 * All players see the same game time (server-authoritative).
 *
 * ponytail: polling every 10s is fine for MVP. WebSocket push would reduce
 * lag, but the tick interval is also 10s so polling aligns naturally.
 */
export function GameTime({ initialGameTimeMs }: Props) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const fmt = (ms: number) => {
      const d = new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0) + ms);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    };

    setDisplay(fmt(initialGameTimeMs));

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/simulation/speed", { cache: "no-store" });
        const data = await res.json();
        if (data.gameTimeMs !== undefined) setDisplay(fmt(data.gameTimeMs));
      } catch {
        // ignore — server might be restarting
      }
    }, 10_000);

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
