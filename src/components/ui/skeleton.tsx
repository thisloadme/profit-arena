import { cn } from "@/lib/cn";

type Props = { className?: string; count?: number };

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border", className)}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-compact flex flex-col gap-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
