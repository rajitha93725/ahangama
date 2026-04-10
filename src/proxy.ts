import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/properties"];
const HOST_ROUTES = ["/properties/new", "/dashboard/host"];
const ADMIN_ROUTES = ["/admin"];

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/images");

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session) {
    const role = session.user?.role;

    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (HOST_ROUTES.some((r) => pathname.startsWith(r)) && role !== "HOST" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/guest", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
