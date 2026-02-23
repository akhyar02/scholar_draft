import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const STUDENT_PREFIX = "/student";
const ADMIN_PREFIX = "/admin";
const PROTECTED_API_PREFIXES = ["/api/student", "/api/admin"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = pathname.startsWith(STUDENT_PREFIX) || pathname.startsWith(ADMIN_PREFIX);
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (isProtectedApi) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith("/api/admin")) {
    if (token.role !== "admin") {
      if (isProtectedApi) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (pathname.startsWith(STUDENT_PREFIX) || pathname.startsWith("/api/student")) {
    if (token.role !== "student") {
      if (isProtectedApi) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*", "/api/student/:path*", "/api/admin/:path*"],
};
