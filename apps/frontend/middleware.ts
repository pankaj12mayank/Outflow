import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPER_ADMIN_REDIRECTS: Record<string, string> = {
  "/app/super-admin": "/system-owner/dashboard",
  "/app/super-admin/organizations": "/system-owner/organizations",
  "/app/super-admin/plans": "/system-owner/plans",
  "/app/super-admin/settings": "/system-owner/settings",
  "/app/super-admin/cms": "/system-owner/cms",
  "/app/super-admin/billing": "/system-owner/payments",
  "/app/super-admin/monitoring": "/system-owner/dashboard",
  "/app/super-admin/abuse": "/system-owner/organizations",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/landing", request.url));
  }

  const target = SUPER_ADMIN_REDIRECTS[pathname];
  if (target) {
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith("/app") && !pathname.startsWith("/app/super-admin")) {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      const login = new URL("/login", request.url);
      login.searchParams.set("redirect", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app/:path*", "/app/super-admin", "/app/super-admin/:path*"],
};
