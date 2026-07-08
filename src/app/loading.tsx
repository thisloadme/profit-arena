export default function RootLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-xs text-text-muted">Loading…</p>
      </div>
    </div>
  );
}
