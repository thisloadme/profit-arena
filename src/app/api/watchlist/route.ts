import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.watchedAsset.findMany({ where: { userId: s.sub }, select: { symbol: true } });
  return NextResponse.json({ symbols: rows.map((r) => r.symbol) });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { symbol } = await req.json().catch(() => ({}));
  if (!symbol || typeof symbol !== "string") return NextResponse.json({ error: "symbol required" }, { status: 422 });
  await prisma.watchedAsset.upsert({
    where: { userId_symbol: { userId: s.sub, symbol } },
    update: {},
    create: { userId: s.sub, symbol },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { symbol } = await req.json().catch(() => ({}));
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 422 });
  await prisma.watchedAsset.deleteMany({ where: { userId: s.sub, symbol } });
  return NextResponse.json({ ok: true });
}
