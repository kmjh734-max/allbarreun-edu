import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  getDashboardPathForRole,
  isRolePathAllowed,
} from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";

const PUBLIC_PREFIXES = [
  "/login",
  "/auth/callback",
  "/student-record/share",
];

function isPublicPath(pathname: string): boolean {
  if (
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return true;
  }
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/image/")) return true;
  if (pathname === "/pdf.worker.min.mjs") return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|mjs)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const dashboardPath = getDashboardPathForRole(role);

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  const rolePrefixes = ["/admin", "/teacher", "/student"];
  const hitsRolePrefix = rolePrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (hitsRolePrefix && !isRolePathAllowed(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardPath;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs)$).*)",
  ],
};
