import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/notifications
 * Query params:
 *   cursor  — last id from previous page (for cursor pagination)
 *   take    — limit (default 30, max 100)
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const takeRaw = parseInt(searchParams.get("take") ?? "30", 10);
  const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(100, takeRaw) : 30;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    }),
    prisma.notification.count({ where: { userId: session.sub, isRead: false } }),
  ]);

  const hasNext = items.length > take;
  const rows = hasNext ? items.slice(0, take) : items;
  const nextCursor = hasNext ? rows[rows.length - 1]?.id : null;

  return NextResponse.json({ items: rows, nextCursor, hasNext, unreadCount });
}
