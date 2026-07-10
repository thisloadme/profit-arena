"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden bg-bg px-4 text-center">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-loss/10 blur-[140px]" />
      <span className="relative text-6xl font-bold text-loss/20">!</span>
      <h1 className="relative text-xl font-bold text-text">Something went wrong</h1>
      <p className="relative max-w-sm text-sm text-text-muted">An unexpected error occurred. Try again or return to dashboard.</p>
      <div className="relative flex gap-2">
        <button onClick={reset} className="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary glow-primary">
          Try Again
        </button>
        <a href="/dashboard" className="rounded border border-border bg-card px-4 py-2 text-sm text-text">
          Dashboard
        </a>
      </div>
    </div>
  );
}
