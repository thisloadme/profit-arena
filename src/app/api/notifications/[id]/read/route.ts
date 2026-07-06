import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId: session.sub },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
