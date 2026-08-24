import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const routePermissions: Record<string, string[]> = {
  "/dashboard": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF", "CASHIER"],
  "/dashboard/pos": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"],
  "/dashboard/cashier": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"],
  "/dashboard/inventory": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/customers": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/staff": ["ROOT_SUPER_ADMIN"],
  "/dashboard/shops": ["ROOT_SUPER_ADMIN"],
  "/dashboard/reports": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/expenses": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/debts": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/refunds": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"],
  "/dashboard/settings": ["ROOT_SUPER_ADMIN"],
  "/dashboard/audit-logs": ["ROOT_SUPER_ADMIN"],
  "/dashboard/analytics": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  "/dashboard/closing-reports": ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
};

export const middleware = auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userRole = (session.user as any)?.role as string;

  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
