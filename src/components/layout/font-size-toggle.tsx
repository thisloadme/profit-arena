"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Size = "compact" | "normal" | "large";

const STEPS: Size[] = ["compact", "normal", "large"];
const LABELS: Record<Size, string> = { compact: "Kecil", normal: "Normal", large: "Besar" };
const SCALE: Record<Size, string> = { compact: "85%", normal: "100%", large: "115%" };

export function FontSizeToggle({ className }: { className?: string }) {
  const [size, setSize] = useState<Size>("normal");

  useEffect(() => {
    document.documentElement.style.fontSize = SCALE[size];
  }, [size]);

  const next = STEPS[(STEPS.indexOf(size) + 1) % STEPS.length];

  return (
    <button
      onClick={() => setSize(next)}
      className={cn("rounded px-2 py-1 text-xs text-text-muted hover:bg-soft", className)}
      title={`Ubah ukuran font: ${LABELS[next]}`}
      aria-label={`Ukuran font saat ini: ${LABELS[size]}`}
    >
      A
    </button>
  );
}
