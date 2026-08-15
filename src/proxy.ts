import { NextResponse, type NextRequest } from "next/server";
import { SESSION_POLICY } from "@/server/auth/authentication.contract";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_POLICY.cookie.name)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/lobby/:path*", "/dice/:path*", "/leaderboard/:path*"],
};
