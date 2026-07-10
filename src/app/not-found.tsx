import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 overflow-hidden bg-bg px-4 text-center">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />
      <span className="relative text-6xl font-bold text-primary/20">404</span>
      <h1 className="relative text-xl font-bold text-text">Page Not Found</h1>
      <p className="relative max-w-sm text-sm text-text-muted">This page doesn&apos;t exist in this simulation.</p>
      <Link href="/dashboard" className="relative rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary glow-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}
