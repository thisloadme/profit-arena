import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.sub) redirect("/login");

  const tutorial = await prisma.tutorialProgress.findUnique({ where: { userId: session.sub } });
  if (tutorial?.completed || tutorial?.skipped) redirect("/dashboard");

  return (
    <main className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-[140px]" />

      <header className="relative mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
          Welcome Aboard
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-text sm:text-4xl">
          Welcome, <span className="text-glow-primary italic text-primary">{session.username}</span>!
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Follow the quick tutorial to learn the game basics.
        </p>
      </header>

      <div className="glass-panel relative mb-6 flex w-full max-w-md flex-col gap-3 p-6 text-left text-sm">
        <p className="font-bold text-text">In this tutorial you will learn:</p>
        <ul className="flex flex-col gap-2 text-text-muted">
          <li className="flex items-start gap-2"><span className="text-primary">▸</span> Understanding <strong className="text-text">Net Worth</strong> and Dashboard</li>
          <li className="flex items-start gap-2"><span className="text-primary">▸</span> Making your <strong className="text-text">first investment</strong> in the Market</li>
          <li className="flex items-start gap-2"><span className="text-primary">▸</span> Starting a <strong className="text-text">business</strong> for passive income</li>
          <li className="flex items-start gap-2"><span className="text-primary">▸</span> Borrowing or giving <strong className="text-text">loans</strong></li>
        </ul>
      </div>

      <div className="relative flex gap-3">
        <Link href="/dashboard">
          <Button className="glow-primary">Start Tutorial →</Button>
        </Link>
        <form action="/api/tutorial" method="PATCH">
          <input type="hidden" name="skipped" value="true" />
          <Button variant="secondary" type="submit">
            Skip for now
          </Button>
        </form>
      </div>
    </main>
  );
}
