import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { BookOpen, TrendingUp, DollarSign, RotateCcw, AlertTriangle } from "lucide-react";
import { GenerateReportButton } from "@/components/reports/generate-report-button";

export const dynamic = "force-dynamic";

export default async function ClosingReportsPage() {
  const session = await auth();
  const user = session!.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  let shopFilter: any = {};
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) shopFilter = { shopId: userShop.shopId };
  }

  const reports = await prisma.closingReport.findMany({
    where: shopFilter,
    include: { shop: { select: { name: true } } },
    orderBy: { reportDate: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Closing Reports</h1>
          <p className="page-subtitle">Daily end-of-day financial summaries</p>
        </div>
        <GenerateReportButton />
      </div>

      {/* Summary of latest report */}
      {reports[0] && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider">Latest Report</p>
              <p className="text-lg font-bold mt-0.5">{reports[0].shop.name} — {formatDate(reports[0].reportDate)}</p>
            </div>
            <div className="p-2.5 bg-white/10 rounded-xl">
              <BookOpen size={20} className="text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Sales", value: formatCurrency(Number(reports[0].totalSales)), icon: DollarSign, color: "text-blue-400" },
              { label: "Total Profit", value: formatCurrency(Number(reports[0].totalProfit)), icon: TrendingUp, color: "text-green-400" },
              { label: "Expenses", value: formatCurrency(Number(reports[0].totalExpenses)), icon: DollarSign, color: "text-red-400" },
              { label: "Refunds", value: formatCurrency(Number(reports[0].totalRefunds)), icon: RotateCcw, color: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3">
                <s.icon size={14} className={cn("mb-1.5", s.color)} />
                <p className={cn("text-xl font-bold font-display", s.color)}>{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <BookOpen size={16} className="text-muted-foreground" />
          <h3 className="font-semibold">Report History</h3>
        </div>
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen size={48} className="mb-3 opacity-30" />
            <p className="font-medium">No reports generated yet</p>
            <p className="text-sm mt-1">Generate your first closing report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shop</th>
                  <th>Sales Count</th>
                  <th>Total Sales</th>
                  <th>Total Profit</th>
                  <th>Expenses</th>
                  <th>Refunds</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const net = Number(report.totalProfit) - Number(report.totalExpenses) - Number(report.totalRefunds);
                  return (
                    <tr key={report.id}>
                      <td className="font-medium text-sm">{formatDate(report.reportDate)}</td>
                      <td className="text-sm">{report.shop.name}</td>
                      <td className="text-sm text-center">{report.salesCount}</td>
                      <td className="font-semibold text-sm">{formatCurrency(Number(report.totalSales))}</td>
                      <td className="text-sm text-emerald-600 font-semibold">{formatCurrency(Number(report.totalProfit))}</td>
                      <td className="text-sm text-red-600">{formatCurrency(Number(report.totalExpenses))}</td>
                      <td className="text-sm text-amber-600">{formatCurrency(Number(report.totalRefunds))}</td>
                      <td className={cn("font-bold text-sm", net >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
