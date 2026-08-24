import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardStats, getSalesTrend, getBuyerTypeBreakdown, getTopProducts, getStaffPerformance } from "@/actions/analytics";
import { getLowStockProducts } from "@/actions/inventory";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

const empty = { success: true, data: [] };

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const canViewAll = !["STAFF", "CASHIER"].includes(user.role);

  const [stats, trend, buyerBreakdown, topProducts, staffPerf, lowStock] = await Promise.all([
    getDashboardStats().catch(() => ({
      success: false,
      data: {
        today: { sales: 0, revenue: 0, profit: 0 },
        month: { sales: 0, revenue: 0, profit: 0, expenses: 0 },
        growth: { revenue: 0, profit: 0 },
        counts: { customers: 0, products: 0, pendingRefunds: 0, lowStock: 0, pendingOrders: 0 },
        debts: { total: 0 },
      },
    })),
    getSalesTrend("month").catch(() => empty),
    getBuyerTypeBreakdown().catch(() => empty),
    getTopProducts(undefined, 5).catch(() => empty),
    canViewAll ? getStaffPerformance().catch(() => empty) : Promise.resolve(empty),
    canViewAll ? getLowStockProducts().catch(() => empty) : Promise.resolve(empty),
  ]);

  return (
    <DashboardClient
      user={user}
      stats={stats.data}
      trend={trend.data || []}
      buyerBreakdown={buyerBreakdown.data || []}
      topProducts={topProducts.data || []}
      staffPerformance={staffPerf.data || []}
      lowStockProducts={(lowStock.data as any[]) || []}
    />
  );
}
