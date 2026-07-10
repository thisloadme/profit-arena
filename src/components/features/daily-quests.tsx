"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Money } from "@/components/ui/money";
import { apiFetch } from "@/lib/api-client";

type QuestItem = {
  code: string;
  title: string;
  description: string;
  targetCount: number;
  rewardCash: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export function DailyQuests({ className }: { className?: string }) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ quests: QuestItem[] }>("/api/quests").then((r) => {
      if (r.ok) setQuests(r.data.quests);
      setLoading(false);
    });
  }, []);

  if (loading || quests.length === 0) return null;

  return (
    <div className={cn("glass-panel p-4", className)}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Daily Quests
      </h3>
      <div className="flex flex-col gap-2">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.targetCount) * 100));
          return (
            <div key={q.code} className="rounded border border-border bg-bg-base px-2.5 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">{q.title}</span>
                <span className="text-text-muted">
                  <Money value={q.rewardCash} />
                </span>
              </div>
              <p className="mt-0.5 text-text-faint">{q.description}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      q.completed ? "bg-profit" : "bg-primary",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="tnum text-[10px] text-text-faint">
                  {q.completed ? `${q.targetCount}/${q.targetCount}` : `${q.progress}/${q.targetCount}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
