import { cn } from "@/lib/cn";

export function AuthDivider({ label = "or", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-xs uppercase tracking-wider text-text-faint", className)}>
      <span className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}