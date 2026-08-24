"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Store, Package, Users, ShoppingBag,
  TrendingUp, DollarSign, AlertTriangle, RefreshCw,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Fetch shop with all stats
  const { data: shopData, isLoading: shopLoading, refetch } = useQuery({
    queryKey: ["shop-detail", id],
    queryFn:  () => fetch(`/api/shops/${id}/stats`).then(r => r.json()),
    staleTime: 0,
  });

  const shop = shopData?.data;

  if (shopLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!shop) return (
    <div className="py-16 text-center text-muted-foreground">
      <Store size={40} className="mx-auto mb-3 opacity-20" />
      <p>Shop not found</p>
      <Link href="/dashboard/shops" className="text-primary text-sm mt-2 inline-block">← Back to shops</Link>
    </div>
  );

  const stats = [
    { label: "Active Products",    value: shop.totalProducts,              icon: Package,     color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30"    },
    { label: "Total Staff",        value: shop.totalStaff,                 icon: Users,       color: "bg-violet-50 text-violet-700 dark:bg-violet-950/30" },
    { label: "Completed Sales",    value: shop.totalSales,                 icon: ShoppingBag, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
    { label: "Total Revenue",      value: formatCurrency(shop.totalRevenue),  icon: DollarSign,  color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
    { label: "Total Profit",       value: formatCurrency(shop.totalProfit),   icon: TrendingUp,  color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30"    },
    { label: "Low Stock Items",    value: shop.lowStockCount,              icon: AlertTriangle, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30"  },
    { label: "Out of Stock",       value: shop.outOfStockCount,            icon: XCircle,     color: "bg-red-50 text-red-700 dark:bg-red-950/30"       },
    { label: "Pending Orders",     value: shop.pendingSales,               icon: Clock,       color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30"  },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/shops"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Shops
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-bold text-lg">{shop.name}</h1>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          shop.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"
        )}>{shop.status}</span>
        <button onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Shop info */}
      {(shop.address || shop.phone || shop.email) && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 text-sm">
          {shop.address && <p className="text-muted-foreground">📍 {shop.address}</p>}
          {shop.phone   && <p className="text-muted-foreground">📞 {shop.phone}</p>}
          {shop.email   && <p className="text-muted-foreground">✉️ {shop.email}</p>}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn("rounded-xl p-4 border border-border", color.replace("text-", "border-").replace(/dark:[^\s]+/, ""))}>
            <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold mb-2", color.split(" ")[1])}>
              <Icon size={13} /> {label}
            </div>
            <p className={cn("text-2xl font-bold", color.split(" ")[1])}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent sales */}
      {shop.recentSales?.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Recent Sales</div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {shop.recentSales.map((s: any) => (
                  <tr key={s.id}>
                    <td><span className="font-mono text-xs font-bold text-primary">{s.orderCode}</span></td>
                    <td className="text-sm">{s.customerName || s.customer?.name || "Walk-in"}</td>
                    <td className="text-sm">{s._count?.items ?? 0}</td>
                    <td className="text-sm font-semibold text-emerald-600">{formatCurrency(s.totalAmount)}</td>
                    <td>
                      <span className={cn("badge text-xs",
                        s.status === "COMPLETED" ? "badge-success" :
                        s.status === "CONFIRMED" ? "badge-info" :
                        s.status === "PENDING"   ? "badge-warning" : "badge-danger")}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff list */}
      {shop.staff?.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Staff ({shop.staff.length})</div>
          <div className="divide-y divide-border">
            {shop.staff.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-sm">{s.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{s.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{s.user?.role?.replace(/_/g," ")}</span>
                  <span className={cn("text-xs font-semibold",
                    s.user?.status === "ACTIVE" ? "text-emerald-600" : "text-muted-foreground")}>
                    {s.user?.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
