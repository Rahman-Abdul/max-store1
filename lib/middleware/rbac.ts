import { UserRole } from "@prisma/client";

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: UserRole[] = [
  UserRole.CASHIER,
  UserRole.STAFF,
  UserRole.SHOP_ADMIN,
  UserRole.ROOT_SUPER_ADMIN,
];

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  const routePermissions: Record<string, UserRole> = {
    "/dashboard": UserRole.CASHIER,
    "/dashboard/pos": UserRole.STAFF,
    "/dashboard/cashier": UserRole.CASHIER,
    "/dashboard/inventory": UserRole.SHOP_ADMIN,
    "/dashboard/customers": UserRole.SHOP_ADMIN,
    "/dashboard/staff": UserRole.ROOT_SUPER_ADMIN,
    "/dashboard/shops": UserRole.ROOT_SUPER_ADMIN,
    "/dashboard/reports": UserRole.SHOP_ADMIN,
    "/dashboard/expenses": UserRole.SHOP_ADMIN,
    "/dashboard/debts": UserRole.SHOP_ADMIN,
    "/dashboard/refunds": UserRole.CASHIER,
    "/dashboard/settings": UserRole.ROOT_SUPER_ADMIN,
    "/dashboard/audit-logs": UserRole.ROOT_SUPER_ADMIN,
    "/dashboard/analytics": UserRole.SHOP_ADMIN,
    "/dashboard/closing-reports": UserRole.SHOP_ADMIN,
  };

  for (const [route, minRole] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      return hasRole(userRole, minRole);
    }
  }

  // Unknown route — allow authenticated users
  return true;
}

export function getDefaultRedirect(role: UserRole): string {
  switch (role) {
    case UserRole.CASHIER:
      return "/dashboard/cashier";
    case UserRole.STAFF:
      return "/dashboard/pos";
    case UserRole.SHOP_ADMIN:
    case UserRole.ROOT_SUPER_ADMIN:
    default:
      return "/dashboard";
  }
}
