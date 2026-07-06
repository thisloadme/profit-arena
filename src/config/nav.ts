import {
  LayoutDashboard,
  CandlestickChart,
  Briefcase,
  Store,
  HandCoins,
  Trophy,
  History,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  /** Marks upcoming routes (rendered but show "segera" badge). */
  soon?: boolean;
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "d" },
  { href: "/market", label: "Market", icon: CandlestickChart, shortcut: "m", soon: true },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase, shortcut: "p", soon: true },
  { href: "/business", label: "Business", icon: Store, shortcut: "b", soon: true },
  { href: "/lending", label: "Lending", icon: HandCoins, shortcut: "l", soon: true },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, shortcut: "k" },
  { href: "/history", label: "History", icon: History, shortcut: "h" },
  { href: "/reports", label: "Reports", icon: BarChart3, shortcut: "r" },
];

/** Items shown in the mobile bottom nav (top 5 by usage). */
export const MOBILE_NAV: NavItem[] = [
  PRIMARY_NAV[0]!, // Dashboard
  PRIMARY_NAV[1]!, // Market
  PRIMARY_NAV[3]!, // Bisnis
  PRIMARY_NAV[4]!, // Pinjaman
  PRIMARY_NAV[5]!, // Ranking
];
