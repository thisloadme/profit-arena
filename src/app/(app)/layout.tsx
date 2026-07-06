import { redirect } from "next/navigation";
import { getTickerState } from "@/server/engine/tick-scheduler";
import { getSession } from "@/lib/session";
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

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.sub },
    select: { username: true, netWorth: true, cash: true, totalAssets: true, totalDebt: true },
  });

  const ticker = getTickerState();

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={{ username: user.username }}
          netWorth={user.netWorth}
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
