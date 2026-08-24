import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSalesTrend, getBuyerTypeBreakdown, getTopProducts, getStaffPerformance } from "@/actions/analytics";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth();
  const user = session!.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  const [weekTrend, monthTrend, yearTrend, buyerBreakdown, topProducts, staffPerf] =
    await Promise.all([
      getSalesTrend("week"),
      getSalesTrend("month"),
      getSalesTrend("year"),
      getBuyerTypeBreakdown(),
      getTopProducts(undefined, 10),
      getStaffPerformance(),
    ]);

  return (
    <AnalyticsClient
      weekTrend={weekTrend.data || []}
      monthTrend={monthTrend.data || []}
      yearTrend={yearTrend.data || []}
      buyerBreakdown={buyerBreakdown.data || []}
      topProducts={topProducts.data || []}
      staffPerformance={staffPerf.data || []}
      user={user}
    />
  );
}
