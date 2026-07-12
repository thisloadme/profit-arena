import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { getSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FloatingActions } from "@/components/layout/fab";
import { AppKeyboard } from "@/components/layout/app-keyboard";
import { Toaster } from "@/components/ui/toaster";
import { TutorialGuide } from "@/components/features/tutorial-guide";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.sub) redirect("/login");

  // Guard: a valid session whose user no longer exists (e.g. DB reset) must
  // not 500 — clear the stale cookie and bounce to login.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, netWorth: true, cash: true, totalAssets: true, totalDebt: true },
  });
  if (!user) {
    const store = await cookies();
    store.delete(SESSION_COOKIE_NAME);
    redirect("/login");
  }

  const ticker = getTickerState();

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={{ username: user.username }}
          netWorth={user.netWorth}
          cash={user.cash}
          changePct={0}
          ticker={{ running: ticker.running, gameTimeMs: ticker.gameTimeMs }}
        />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <FloatingActions />
      <BottomNav />
      <AppKeyboard />
      <Toaster />
      <TutorialGuide />
    </div>
  );
}
