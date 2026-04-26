import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PASSWORD_SETUP_COOKIE = "vip_needs_password_setup";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/auth/callback" || pathname === "/auth/set-password") {
    return NextResponse.next();
  }

  const needsPasswordSetup = request.cookies.get(PASSWORD_SETUP_COOKIE)?.value === "1";
  if (needsPasswordSetup) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/set-password";
    redirect.search = `?next=${encodeURIComponent(`${pathname}${search || ""}`)}`;
    return NextResponse.redirect(redirect);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
