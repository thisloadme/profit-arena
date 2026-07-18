"use client";

import { useEffect, useState } from "react";

// skip SW in dev — prevents HMR reload loops from stale cache.
const IS_DEV = process.env.NODE_ENV === "development";

let deferredPrompt: Event | null = null;

export function PwaRegister() {
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // always unregister old SWs (kills reload loops from stale cache)
    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length === 0) return;
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        if (navigator.serviceWorker.controller) location.reload();
      });
    });

    if (IS_DEV) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});

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
      <p className="text-xs font-medium text-text">Install Market Arena for the best experience</p>
      <div className="mt-2 flex gap-2">
        <button onClick={install} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-hover">
          Install
        </button>
        <button onClick={() => setShowInstall(false)} className="rounded px-3 py-1.5 text-xs text-text-muted hover:bg-soft">
          Not now
        </button>
      </div>
    </div>
  );
}
