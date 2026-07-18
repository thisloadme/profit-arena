"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: "13px",
        },
      }}
      // accent border-left per type via inline override.
      // Sonner merges variant-specific style on top of the base toastOptions.style.
      className="toaster-group"
    />
  );
}
