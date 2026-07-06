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
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 p-6 text-center">
      <header>
        <h1 className="text-2xl font-bold text-primary">Welcome, {session.username}!</h1>
        <p className="mt-1 text-sm text-text-muted">
          Follow the quick tutorial to learn the game basics.
        </p>
      </header>

      <div className="card-compact flex flex-col gap-3 text-left text-sm">
        <p className="font-medium text-text">In this tutorial you will learn:</p>
        <ul className="list-inside list-disc text-text-muted">
          <li>Understanding <strong>Net Worth</strong> and Dashboard</li>
          <li>Making your <strong>first investment</strong> in the Market</li>
          <li>Starting a <strong>business</strong> for passive income</li>
          <li>Borrowing or giving <strong>loans</strong></li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Start Tutorial →</Button>
        </Link>
        <form action="/api/tutorial" method="PATCH">
          <input type="hidden" name="skipped" value="true" />
          <Button variant="secondary" type="submit">
            Skip
          </Button>
        </form>
      </div>
    </main>
  );
}
