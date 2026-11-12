import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "tokoana-super-secret-jwt-key-2026-secure-session-hash";
const key = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "tokoana_session";

// Routes that require 'admin' role
const ADMIN_ROUTES = [
  "/products",
  "/transaksi",
  "/pelanggan",
  "/pengaturan",
  "/pengguna",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api auth endpoints, public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let user: { id: number; name: string; email: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key);
      user = {
        id: Number(payload.id),
        name: String(payload.name),
        email: String(payload.email),
        role: String(payload.role),
      };
    } catch {
      user = null;
    }
  }

  // 1. Guest routes
  if (pathname === "/login") {
    if (user) {
      // Redirect logged-in user away from login
      const target = user.role === "kasir" ? "/kasir" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 2. Protected routes - require login
  if (!user) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root redirect based on role
  if (pathname === "/") {
    const target = user.role === "kasir" ? "/kasir" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 3. Admin-only route guard
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdminRoute && user.role !== "admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    // Redirect kasir to /kasir
    return NextResponse.redirect(new URL("/kasir", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
