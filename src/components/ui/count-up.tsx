"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/cn";

type Props = {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  formatter?: (v: number) => string;
};

/**
 * Animated counter — numbers count up/down on mount and when `to` changes.
 *
 * ponytail: uses framer-motion's `animate()` for lerp, renders a `motion.span`.
 * Replace with `useMotionValue` + `useTransform` if `to` changes frequently
 * (e.g., every tick) to avoid re-creating the animation.
 */
export function CountUp({ from = 0, to, duration = 0.6, className, formatter }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(from);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(prev.current, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        node.textContent = formatter ? formatter(v) : String(Math.round(v));
      },
    });
    prev.current = to;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatter ? formatter(from) : String(Math.round(from))}
    </span>
  );
}
