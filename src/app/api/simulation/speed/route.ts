import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTickerState } from "@/server/engine/tick-scheduler";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(getTickerState());
}
