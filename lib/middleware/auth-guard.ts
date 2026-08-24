import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

/**
 * Server-side auth guard for page components.
 * Use at the top of any page that requires authentication.
 *
 * @example
 * // Allow any authenticated user
 * const session = await requireAuth();
 *
 * // Require a specific role
 * const session = await requireAuth("SHOP_ADMIN");
 */
export async function requireAuth(minRole?: UserRole) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role as UserRole;

  if (minRole) {
    const ROLE_HIERARCHY: UserRole[] = ["CASHIER", "STAFF", "SHOP_ADMIN", "ROOT_SUPER_ADMIN"];
    const userIdx = ROLE_HIERARCHY.indexOf(userRole);
    const reqIdx = ROLE_HIERARCHY.indexOf(minRole);

    if (userIdx < reqIdx) {
      redirect("/dashboard");
    }
  }

  return session;
}

/**
 * Server-side guard that only allows Root Super Admin.
 * Redirects anyone else to /dashboard.
 */
export async function requireRootAdmin() {
  return requireAuth("ROOT_SUPER_ADMIN");
}

/**
 * Server-side guard that allows Shop Admin and above.
 */
export async function requireShopAdmin() {
  return requireAuth("SHOP_ADMIN");
}
