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

const TYPE_STYLES: Record<string, string> = {
  macro: "border-warning/40 bg-warning-soft",
  sector: "border-info/40 bg-info-soft",
  sentiment: "border-accent/30 bg-primary-soft",
};

const TYPE_ICON: Record<string, string> = {
  macro: "🌍",
  sector: "🏭",
  sentiment: "📊",
};

export function EventFeed({ events, className }: Props) {
  return (
    <div className={cn("card-compact", className)}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Market Events
      </h3>
      {events.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-faint">No active events.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <div
              key={e.id}
              className={cn(
                "rounded border px-2.5 py-2 text-xs",
                TYPE_STYLES[e.eventType] ?? "border-border bg-bg-base",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden>{TYPE_ICON[e.eventType] ?? "📌"}</span>
                <span className="font-medium text-text">{e.description}</span>
              </div>
              {e.endAt && (
                <p className="mt-0.5 text-text-faint">
                  Ends: {new Date(e.endAt).toLocaleDateString("en-US")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
