/**
 * Lightweight event tracking.
 * ponytail: console.log in dev, no-op in prod unless a provider is configured.
 * Swap implementation by changing this one file when adding PostHog/Plausible/etc.
 */

type Event = "register" | "login" | "first_trade" | "tutorial_complete" | "feedback" | "session";

export function track(event: Event, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${event}`, data ?? "");
  }
  // Production: POST to /api/analytics for server-side logging
  if (process.env.NODE_ENV === "production" && typeof fetch !== "undefined") {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }
}
