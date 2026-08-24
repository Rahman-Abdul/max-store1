"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3,
  DollarSign, CreditCard, RotateCcw, Settings, Store,
  FileText, Activity, ChevronLeft, ChevronRight, AlertTriangle,
  Boxes, UserCog, Receipt, TrendingUp, BookOpen, ShieldCheck,
  Zap, Menu, X, Wrench
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF", "CASHIER"],
  },
  {
    label: "POS Terminal",
    href: "/dashboard/pos",
    icon: Zap,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"],
  },
  {
    label: "Cashier Desk",
    href: "/dashboard/cashier",
    icon: Receipt,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Sales History",
    href: "/dashboard/sales",
    icon: ShoppingCart,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"],
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Debts",
    href: "/dashboard/debts",
    icon: CreditCard,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Refunds & Returns",
    href: "/dashboard/refunds",
    icon: RotateCcw,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: DollarSign,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: TrendingUp,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Repairs",
    href: "/dashboard/repairs",
    icon: Wrench,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF", "CASHIER"],
  },
  {
    label: "Closing Reports",
    href: "/dashboard/closing-reports",
    icon: BookOpen,
    roles: ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"],
  },
  {
    label: "Staff Management",
    href: "/dashboard/staff",
    icon: UserCog,
    roles: ["ROOT_SUPER_ADMIN"],
  },
  {
    label: "Shops",
    href: "/dashboard/shops",
    icon: Store,
    roles: ["ROOT_SUPER_ADMIN"],
  },
  {
    label: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: ShieldCheck,
    roles: ["ROOT_SUPER_ADMIN"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ROOT_SUPER_ADMIN"],
  },
];

const roleLabels: Record<string, string> = {
  ROOT_SUPER_ADMIN: "Root Super Admin",
  SHOP_ADMIN: "Shop Admin",
  STAFF: "Staff",
  CASHIER: "Cashier",
};

const roleColors: Record<string, string> = {
  ROOT_SUPER_ADMIN: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  SHOP_ADMIN: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  STAFF: "bg-green-500/20 text-green-300 border border-green-500/30",
  CASHIER: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    avatar?: string | null;
    shops?: Array<{ id: string; name: string; slug: string }>;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-slate-700/50 shrink-0",
        sidebarCollapsed ? "justify-center" : "gap-3"
      )}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shrink-0">
          <ShoppingCart size={18} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <span className="font-bold text-white font-display text-lg leading-none">
              MAX STORE
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800",
                sidebarCollapsed && "justify-center px-2"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className={cn(
        "p-3 border-t border-slate-700/50 shrink-0",
        sidebarCollapsed ? "flex justify-center" : ""
      )}>
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                roleColors[user.role]
              )}>
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
            {(user.name || "U").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Collapse button (desktop) */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:flex items-center justify-center h-10 border-t border-slate-700/50
                   text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs gap-1 shrink-0"
      >
        {sidebarCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <>
            <ChevronLeft size={16} />
            <span>Collapse</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col h-screen transition-all duration-300 shrink-0",
        sidebarCollapsed ? "w-16" : "w-60"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
