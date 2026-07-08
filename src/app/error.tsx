"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <span className="text-6xl font-bold text-loss/20">!</span>
      <h1 className="text-xl font-bold text-text">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-muted">An unexpected error occurred. Try again or return to dashboard.</p>
      <div className="flex gap-2">
        <button onClick={reset} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white">
          Try Again
        </button>
        <a href="/dashboard" className="rounded border border-border bg-card px-4 py-2 text-sm text-text">
          Dashboard
        </a>
      </div>
    </div>
  );
}
