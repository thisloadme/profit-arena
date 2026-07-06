"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CandlestickChart,
  Store,
  HandCoins,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Live Market",
    desc: "Trade stocks, crypto, bonds & funds with real-time price simulation.",
  },
  {
    icon: Store,
    title: "Business Builder",
    desc: "Start and scale ventures from cafes to tech startups.",
  },
  {
    icon: HandCoins,
    title: "P2P Lending",
    desc: "Borrow or lend — earn interest or fuel your next move.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio Tracker",
    desc: "Track net worth, P&L, and allocations in one dashboard.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function LandingPage() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1a2e] via-[#142b44] to-[#1e3a5f] px-4">
      {/* Animated orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-soft/10 blur-[120px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex w-full max-w-3xl flex-col items-center gap-10"
      >
        {/* Hero */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Financial Simulation
            <span className="bg-gradient-to-r from-accent to-blue-300 bg-clip-text text-transparent">
              {" "}Arena
            </span>
          </h1>
          <p className="max-w-md text-sm text-blue-200/70">
            Build wealth from zero. Trade markets, run businesses, manage
            loans — all in a risk-free simulation.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/30 transition-all hover:brightness-110"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-blue-100 transition-all hover:bg-white/5"
          >
            Sign In
          </Link>
        </motion.div>

        {/* Features */}
        <motion.div
          variants={fadeUp}
          className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center backdrop-blur-sm"
            >
              <f.icon className="h-5 w-5 text-accent" />
              <span className="text-xs font-semibold text-white">{f.title}</span>
              <span className="text-[10px] leading-relaxed text-blue-200/60">
                {f.desc}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={fadeUp}
          className="text-[11px] text-blue-200/40"
        >
          Start with zero. Learn without risk.
        </motion.p>
      </motion.div>
    </main>
  );
}
