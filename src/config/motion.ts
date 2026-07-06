import type { Variants, Transition } from "framer-motion";

/** Shared transition presets — ponytail: one source of truth for all animations. */
export const fastTransition: Transition = { duration: 0.15, ease: "easeOut" };
export const springTransition: Transition = { type: "spring", stiffness: 300, damping: 25 };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: fastTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
};
