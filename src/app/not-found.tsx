import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
      <span className="text-6xl font-bold text-primary/20">404</span>
      <h1 className="text-xl font-bold text-text">Page Not Found</h1>
      <p className="max-w-sm text-sm text-text-muted">This page doesn&apos;t exist in this simulation.</p>
      <Link href="/dashboard" className="rounded bg-primary px-4 py-2 text-sm font-medium text-white">
        Back to Dashboard
      </Link>
    </div>
  );
}
