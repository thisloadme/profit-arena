"use client";

import { cn } from "@/lib/cn";

type EventItem = {
  id: string;
  eventType: string;
  description: string;
  endAt: Date | string | null;
};

type Props = {
  events: EventItem[];
  className?: string;
};

/**
 * Stitch-style list feed: each event is a row with a colored left border
 * (border-l-2) tinted by event type, instead of a stack of full cards.
 * Lives inside a glass-panel container.
 */
const TYPE_BORDER: Record<string, string> = {
  macro: "border-l-warning",
  sector: "border-l-info",
  sentiment: "border-l-accent",
};

const TYPE_ICON: Record<string, string> = {
  macro: "🌍",
  sector: "🏭",
  sentiment: "📊",
};

export function EventFeed({ events, className }: Props) {
  return (
    <div className={cn("glass-panel flex flex-col p-4", className)}>
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
        Live Feed &amp; Events
      </h3>
      {events.length === 0 ? (
        <p className="py-6 text-center text-xs text-text-faint">No active events.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <div
              key={e.id}
              className={cn(
                "rounded-md border border-border border-l-2 bg-surface-lowest/50 px-3 py-2",
                TYPE_BORDER[e.eventType] ?? "border-l-border",
              )}
            >
              <div className="flex items-start gap-1.5">
                <span aria-hidden className="mt-0.5">
                  {TYPE_ICON[e.eventType] ?? "📌"}
                </span>
                <span className="text-xs font-medium leading-relaxed text-text">
                  {e.description}
                </span>
              </div>
              {e.endAt && (
                <p className="tnum mt-1 pl-6 text-[10px] text-text-faint">
                  Ends {new Date(e.endAt).toLocaleDateString("en-US")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
