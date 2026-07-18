import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";

/**
 * GET /api/transactions
 * Query params:
 *   cursor  — last id from previous page (for cursor pagination)
 *   take    — limit (default 25, max 100)
 *   type    — filter by TransactionType (BUY, SELL, SALARY, etc.)
 *   from    — ISO date filter (inclusive)
 *   to      — ISO date filter (inclusive)
 *   csv     — if "1" returns text/csv instead of JSON
 */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const takeRaw = parseInt(searchParams.get("take") ?? "25", 10);
  const take = Number.isFinite(takeRaw) && takeRaw > 0 ? Math.min(100, takeRaw) : 25;
  const type = searchParams.get("type") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const isCsv = searchParams.get("csv") === "1";

  const where: Prisma.TransactionWhereInput = { userId: s.sub };
  if (type && type !== "ALL") where.type = type as never;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeNullableFilter).gte = new Date(from);
    if (to) (where.createdAt as Prisma.DateTimeNullableFilter).lte = new Date(to);
  }

  const items = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasNext = items.length > take;
  const rows = hasNext ? items.slice(0, take) : items;
  const nextCursor = hasNext ? rows[rows.length - 1]?.id : null;

  const rowsSerialized = rows.map((r) => ({ ...r, amount: Number(r.amount) }));

  if (isCsv) {
    const header = "id,type,amount,description,relatedAsset,createdAt\n";
    const body = rowsSerialized
      .map((r) =>
        [r.id, r.type, r.amount, `"${r.description}"`, r.relatedAsset ?? "", r.createdAt.toISOString()].join(","),
      )
      .join("\n");
    return new NextResponse(header + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions.csv"`,
      },
    });
  }

  return NextResponse.json({ rows: rowsSerialized, nextCursor, hasNext });
}
