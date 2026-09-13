import { NextResponse, type NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/session-token";

/**
 * Optimistic auth gate (Next 16's replacement for Middleware).
 *
 * This only checks the cookie's signature/expiry so an unauthenticated visitor
 * is redirected before any page renders. It is NOT the authorization boundary:
 * every page and Server Action re-checks against the database via the DAL.
 *
 * `/api/*` is excluded on purpose — route handlers return a 401 JSON response
 * rather than an HTML redirect. Server Actions are POSTs to page routes, which
 * this matcher still covers.
 */
const PUBLIC_PATHS = ["/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session && !isPublic(pathname)) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session && isPublic(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$).*)",
  ],
};
