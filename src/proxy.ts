import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

const PROTECTED = [
  "/dashboard",
  "/market",
  "/portfolio",
  "/business",
  "/lending",
  "/leaderboard",
  "/history",
  "/settings",
  "/onboarding",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isProtected) return NextResponse.next();

  const session = await getSessionFromRequest(req);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/market/:path*",
    "/portfolio/:path*",
    "/business/:path*",
    "/lending/:path*",
  "/leaderboard/:path*",
  "/history/:path*",
  "/reports/:path*",
  "/settings/:path*",
    "/onboarding/:path*",
  ],
};
