import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orders = await prisma.limitOrder.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      symbol: true,
      type: true,
      quantity: true,
      limitPrice: true,
      status: true,
      createdAt: true,
      executedAt: true,
    },
  });

  return NextResponse.json({ orders });
}
