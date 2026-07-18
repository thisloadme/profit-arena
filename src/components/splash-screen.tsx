"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import logoWithBg from "@/assets/marketarena_logo.png";

const MIN_VISIBLE_MS = 600;

/**
 * Branded splash — shown on every full page load, dismissed after the page
 * paints + a minimum visible window so the logo isn't a flash. Renders into
 * the root layout so it covers all routes (landing, login, app shell).
 *
 * global flag (window.__splashShown) prevents re-mounting the
 * splash when the user navigates client-side after first paint — that
 * would be the most annoying failure mode of an every-reload splash.
 */
export function SplashScreen() {
  // Lazy init from the global flag so we don't setState synchronously in the
  // effect body (React 19 rule). If the splash was already shown this session,
  // start hidden immediately.
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return true;
    return !(window as Window & { __splashShown?: number }).__splashShown;
  });

  useEffect(() => {
    if (!show) return;

    const start = Date.now();
    const dismiss = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      setTimeout(() => {
        (window as Window & { __splashShown?: number }).__splashShown = Date.now();
        setShow(false);
      }, wait);
    };

    if (document.readyState === "complete") dismiss();
    else window.addEventListener("load", dismiss, { once: true });
    return () => window.removeEventListener("load", dismiss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          role="status"
          aria-label="Loading Market Arena"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-bg"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative"
          >
            <Image
              src={logoWithBg}
              alt="Market Arena"
              width={180}
              height={180}
              priority
              className="h-44 w-44 rounded-2xl"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-lg font-black tracking-tight text-text">Market Arena</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-text-faint">
              Financial Simulation Arena
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-surface-highest"
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: MIN_VISIBLE_MS / 1000, ease: "easeOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
