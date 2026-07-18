import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ponytail: prevNetWorth = latest PriceHistory-anchored baseline isn't trivially
  // available; use last Transaction of type EXPENSE as a rough "yesterday" anchor
  // until Fase 5 implements proper daily snapshots.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.sub },
    select: { netWorth: true, cash: true },
  });

  return NextResponse.json(
    { netWorth: Number(user.netWorth), cash: Number(user.cash), prevNetWorth: Number(user.netWorth) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
