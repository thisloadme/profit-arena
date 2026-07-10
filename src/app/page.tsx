"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  CandlestickChart,
  Store,
  HandCoins,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Trophy,
} from "lucide-react";

/**
 * Landing page — "Money Carnival".
 * Structure follows Stitch Landing design:
 *   fixed glass nav → hero (badge + display headline + CTAs + mockup)
 *   → bento grid (asymmetric glass cards) → trust strip → footer stats.
 *
 * Color: solid --bg-base with glow orbs (emerald/blue/amber) instead of a
 * bespoke gradient. All text uses semantic tokens so it flips with theme.
 */

const NAV_LINKS = [
  { href: "/market", label: "Market" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/business", label: "Business" },
];

const BENTO = [
  {
    icon: CandlestickChart,
    title: "Live Market Simulation",
    desc: "Real-time price ticks for stocks, crypto, bonds, and mutual funds. Place market or limit orders with live volume impact.",
    stat: "40+ assets",
    span: "lg:col-span-8",
  },
  {
    icon: HandCoins,
    title: "P2P Lending",
    desc: "Borrow from players or fund peers. Earn interest, manage credit, fuel your next move.",
    stat: "Player-driven",
    span: "lg:col-span-4",
  },
];

const BENTO_BOTTOM = [
  {
    icon: Store,
    title: "Business Builder",
    desc: "Launch ventures from stable cafes to volatile tech startups. Watch revenue compound while you manage expenses and employees.",
  },
  {
    icon: TrendingUp,
    title: "Portfolio Tracker",
    desc: "Net worth, allocations, P&L, and cash flow in one glass dashboard. Drag to rebalance, click to drill in.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function LandingPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-bg text-text">
      {/* Glow orbs — the signature "arena" ambience */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-warning/5 blur-[120px]" />

      {/* ===== Top navigation (fixed glass) ===== */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-on-primary">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-sm font-black tracking-tighter text-text">
              Money Carnival
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary transition-all hover:brightness-110 glow-primary"
            >
              Start Your Journey
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 lg:py-28 lg:px-10"
      >
        {/* Badge pill */}
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Live Simulation
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-text sm:text-5xl lg:text-6xl"
        >
          Build wealth from zero in a{" "}
          <span className="text-glow-primary italic text-primary">risk-free</span>{" "}
          financial arena.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          variants={fadeUp}
          className="max-w-xl text-sm text-text-muted sm:text-base"
        >
          Trade live markets. Run businesses. Borrow, lend, and grow. Compete on
          the global leaderboard — all with virtual money and zero real-world risk.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-all hover:scale-[1.02] glow-primary"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/leaderboard"
            className="glass-panel inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-highest"
          >
            <Trophy className="h-4 w-4 text-warning" />
            View Live Leaderboard
          </Link>
        </motion.div>

        {/* Mockup glass card (placeholder — replace with real screenshot later) */}
        <motion.div
          variants={fadeUp}
          className="glass-panel mt-8 w-full max-w-3xl overflow-hidden p-2"
        >
          <div className="animate-float rounded-lg border border-border bg-surface-lowest p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-loss/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-profit/60" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-text-faint">
                Dashboard Preview
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="glass-panel p-3">
                <span className="text-[10px] uppercase tracking-widest text-text-faint">Net Worth</span>
                <span className="tnum mt-1 block text-lg font-bold text-primary">$2.4M</span>
                <span className="tnum text-[10px] text-profit">+12.4% ▲</span>
              </div>
              <div className="glass-panel p-3">
                <span className="text-[10px] uppercase tracking-widest text-text-faint">Cash</span>
                <span className="tnum mt-1 block text-lg font-bold text-text">$486K</span>
                <span className="tnum text-[10px] text-text-muted">Liquid</span>
              </div>
              <div className="glass-panel p-3">
                <span className="text-[10px] uppercase tracking-widest text-text-faint">Today</span>
                <span className="tnum mt-1 block text-lg font-bold text-profit">+$24K</span>
                <span className="tnum text-[10px] text-text-muted">5 trades</span>
              </div>
            </div>
            {/* Mini sparkline placeholder */}
            <div className="mt-3 h-20 rounded-md bg-gradient-to-b from-primary/10 to-transparent">
              <svg viewBox="0 0 300 60" className="h-full w-full" preserveAspectRatio="none">
                <path
                  d="M0,45 Q50,30 100,35 T200,15 T300,20"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ===== Bento grid ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {BENTO.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className={`glass-panel group flex flex-col gap-3 p-6 transition-transform hover:-translate-y-1 ${card.span}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                    {card.stat}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text">{card.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{card.desc}</p>
                <Link
                  href="/register"
                  className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:gap-2"
                >
                  Explore <ArrowUpRight className="h-3 w-3" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom row — 2 cards full width */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {BENTO_BOTTOM.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="glass-panel group flex flex-col gap-3 p-6 transition-transform hover:-translate-y-1"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-text">{card.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== Footer — live stats strip ===== */}
      <footer className="mt-16 border-t border-border bg-surface-lowest">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6 lg:px-10">
          {[
            { label: "Live Traders", value: "1,247", accent: false },
            { label: "Total Simulated Wealth", value: "$847M", accent: true },
            { label: "Trades Today", value: "24.5K", accent: false },
            { label: "Active Markets", value: "42", accent: false },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                {s.label}
              </span>
              <span className={`tnum text-2xl font-bold ${s.accent ? "text-primary" : "text-text"}`}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-4 sm:px-6 lg:px-10">
          <p className="mx-auto max-w-7xl text-center text-[11px] text-text-faint">
            Money Carnival — Start with zero. Learn without risk.
          </p>
        </div>
      </footer>
    </main>
  );
}
