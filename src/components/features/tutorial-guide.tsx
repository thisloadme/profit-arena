"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

type Progress = {
  currentStep: number;
  completed: boolean;
  skipped: boolean;
};

const STEPS = [
  {
    title: "Welcome! 👋",
    description:
      "Start from zero, build your wealth through investments, businesses, and loans. Get familiar with the dashboard and take your first action.",
    action: { label: "View Dashboard", href: "/dashboard" },
  },
  {
    title: "Understand Net Worth",
    description:
      "Net Worth = Total Assets − Total Debt. This is the most important number in the game. Check the dashboard to see your current position.",
    action: { label: "Got it!", href: "/dashboard" },
  },
  {
    title: "First Investment 📈",
    description:
      "Open the Market, find an asset that interests you (try APPL stock or BTC crypto). Buy at least 1 unit.",
    action: { label: "Open Market", href: "/market" },
  },
  {
    title: "Start a Business 🏪",
    description:
      "Businesses generate passive income every tick. Choose a Cafe for low capital or a Tech Startup for high potential.",
    action: { label: "Open Business", href: "/business" },
  },
  {
    title: "Borrow or Lend 💰",
    description:
      "Need capital? Take a loan from the NPC Bank or other players. Have extra cash? Lend it out and earn interest.",
    action: { label: "Open Lending", href: "/lending" },
  },
];

const DONE = {
  title: "Ready to Play! 🎉",
  description:
    "You're all set! Remember: diversify, don't over-leverage, and keep an eye on the market. Good luck!",
  action: { label: "Let's Go!", href: "/dashboard" },
};

export function TutorialGuide() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    const r = await apiFetch<{
      currentStep: number;
      completed: boolean;
      skipped: boolean;
    }>("/api/tutorial");
    if (r.ok) setProgress(r.data);
    else setLoading(false);
  }

  async function goToStep(step: number) {
    const r = await apiFetch("/api/tutorial", { method: "PATCH", body: { step } });
    if (!r.ok) { toast.error(r.error); return; }
    setProgress((p) => (p ? { ...p, currentStep: step } : p));
  }

  async function markSkipped() {
    const r = await apiFetch("/api/tutorial", { method: "PATCH", body: { skipped: true } });
    if (!r.ok) { toast.error(r.error); return; }
    setProgress((p) => (p ? { ...p, skipped: true } : p));
  }

  async function markCompleted() {
    const r = await apiFetch("/api/tutorial", { method: "PATCH", body: { completed: true } });
    if (!r.ok) { toast.error(r.error); return; }
    router.push("/dashboard");
  }

  if (loading || !progress) return null;
  if (progress.skipped || progress.completed) return null;

  const isLast = progress.currentStep >= STEPS.length - 1;
  const step = STEPS[progress.currentStep] ?? STEPS[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i === progress.currentStep ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
          <button
            onClick={markSkipped}
            className="text-xs text-text-muted hover:text-text"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <h2 className="text-base font-bold text-text">{step.title}</h2>
        <p className="text-sm leading-relaxed text-text-muted">{step.description}</p>

        {/* Action */}
        <div className="flex gap-2">
          {isLast ? (
            <Button onClick={markCompleted} className="flex-1">
              {DONE.action.label}
            </Button>
          ) : (
            <Button
              onClick={() => {
                const next = progress.currentStep + 1;
                goToStep(next);
                // Navigate to the step's page (preload)
                if (step.action.href) router.prefetch(step.action.href);
              }}
              className="flex-1"
            >
              {step.action.label}
            </Button>
          )}
          {!isLast && (
            <Button variant="secondary" onClick={markCompleted}>
              Skip All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
