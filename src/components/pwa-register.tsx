"use client";

import { useEffect, useState } from "react";

// ponytail: deferredPrompt kept as module-level — the event is fired once.
let deferredPrompt: Event | null = null;

export function PwaRegister() {
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    (deferredPrompt as Event & { prompt: () => void }).prompt();
    const result = await (deferredPrompt as Event & { userChoice: Promise<{ outcome: string }> }).userChoice;
    if (result.outcome === "accepted") setShowInstall(false);
    deferredPrompt = null;
  }

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border border-border bg-card p-3 shadow-raised sm:left-auto sm:right-4">
      <p className="text-xs font-medium text-text">Install Finsim for the best experience</p>
      <div className="mt-2 flex gap-2">
        <button onClick={install} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover">
          Install
        </button>
        <button onClick={() => setShowInstall(false)} className="rounded px-3 py-1.5 text-xs text-text-muted hover:bg-soft">
          Not now
        </button>
      </div>
    </div>
  );
}
