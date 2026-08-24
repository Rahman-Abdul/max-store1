"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import { formatCurrency, getBuyerTypeLabel, cn } from "@/lib/utils";
import { TrendingUp, Users, Package, Zap, Brain, ArrowUp, ArrowDown } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            {p.name}: {typeof p.value === "number" && p.name !== "sales"
              ? formatCurrency(p.value)
              : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface Props {
  weekTrend: any[];
  monthTrend: any[];
  yearTrend: any[];
  buyerBreakdown: any[];
  topProducts: any[];
  staffPerformance: any[];
  user: any;
}

export function AnalyticsClient({ weekTrend, monthTrend, yearTrend, buyerBreakdown, topProducts, staffPerformance, user }: Props) {
  const [trendPeriod, setTrendPeriod] = useState<"week" | "month" | "year">("month");

  const trendData = trendPeriod === "week" ? weekTrend : trendPeriod === "month" ? monthTrend : yearTrend;

  const totalRevenue = trendData.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = trendData.reduce((s, d) => s + d.profit, 0);
  const totalSales = trendData.reduce((s, d) => s + d.sales, 0);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // AI Insights (rule-based)
  const insights = generateInsights(topProducts, staffPerformance, buyerBreakdown, totalRevenue, totalProfit);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & AI Insights</h1>
          <p className="page-subtitle">Deep business intelligence and performance analytics</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-violet-900/50 to-blue-900/50 border border-violet-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={20} className="text-violet-400" />
          <h2 className="font-bold text-white">AI Business Insights</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
            Auto-generated
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight, i) => (
            <div key={i} className={cn(
              "bg-white/5 border rounded-xl p-4",
              insight.priority === "high" ? "border-red-500/30" :
                insight.priority === "medium" ? "border-amber-500/30" : "border-white/10"
            )}>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{insight.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{insight.title}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{insight.description}</p>
                </div>
              </div>
              {insight.metric && (
                <p className="text-xs text-slate-400 mt-2 pl-7">{insight.metric}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Period summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "text-blue-600", icon: "💰" },
          { label: "Total Profit", value: formatCurrency(totalProfit), color: "text-emerald-600", icon: "📈" },
          { label: "Total Sales", value: totalSales, color: "text-violet-600", icon: "🛒" },
          { label: "Profit Margin", value: `${profitMargin.toFixed(1)}%`, color: profitMargin > 20 ? "text-emerald-600" : "text-amber-600", icon: "🎯" },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-lg mb-2">{item.icon}</p>
            <p className={cn("text-2xl font-bold font-display", item.color)}>{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue trend chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">Revenue & Profit Trend</h3>
            <p className="text-xs text-muted-foreground">Historical performance analysis</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTrendPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  trendPeriod === p
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p === "week" ? "7 days" : p === "month" ? "30 days" : "12 months"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => v.split("-").slice(1).join("/")} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#gRevenue)" />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#gProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products bar chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Top Products by Revenue</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="productName" tick={{ fontSize: 10 }} tickLine={false}
                  axisLine={false} width={100}
                  tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + "…" : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No sales data</div>
          )}
        </div>

        {/* Buyer type pie */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Revenue by Buyer Type</h3>
          {buyerBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={buyerBreakdown} cx="50%" cy="50%" outerRadius={80} paddingAngle={3}
                    dataKey="revenue" nameKey="buyerType">
                    {buyerBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatCurrency(v as number), getBuyerTypeLabel(n as string)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {buyerBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-sm">{getBuyerTypeLabel(item.buyerType)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.count} sales)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Staff performance table */}
      {staffPerformance.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold">Staff Performance Ranking</h3>
            <p className="text-xs text-muted-foreground">All time performance metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  <th>Staff Member</th>
                  <th>Total Sales</th>
                  <th>Revenue</th>
                  <th>Profit Generated</th>
                  <th>Avg Order Value</th>
                  <th>Profit Share</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((s, i) => {
                  const profitShare = totalProfit > 0 ? (s.totalProfit / totalProfit) * 100 : 0;
                  return (
                    <tr key={s.staffId}>
                      <td>
                        <span className={cn(
                          "text-sm font-bold",
                          i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-500" : "text-muted-foreground"
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {s.staffName.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{s.staffName}</span>
                        </div>
                      </td>
                      <td className="text-sm">{s.totalSales}</td>
                      <td className="font-semibold text-sm">{formatCurrency(s.totalRevenue)}</td>
                      <td className="text-emerald-600 font-semibold text-sm">{formatCurrency(s.totalProfit)}</td>
                      <td className="text-sm">{formatCurrency(s.averageOrder)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${profitShare}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {profitShare.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function generateInsights(topProducts: any[], staff: any[], buyers: any[], revenue: number, profit: number) {
  const insights: Array<{ title: string; description: string; icon: string; priority: string; metric?: string }> = [];

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  if (margin < 15) {
    insights.push({
      title: "Low Profit Margin Warning",
      description: "Your profit margin is below 15%. Consider reviewing pricing strategy.",
      icon: "⚠️",
      priority: "high",
      metric: `Current margin: ${margin.toFixed(1)}%`,
    });
  } else {
    insights.push({
      title: "Healthy Profit Margin",
      description: "Your profit margin is performing well. Keep maintaining current pricing.",
      icon: "✅",
      priority: "low",
      metric: `Current margin: ${margin.toFixed(1)}%`,
    });
  }

  if (topProducts.length > 0) {
    const top = topProducts[0];
    insights.push({
      title: `Best Seller: ${top.productName}`,
      description: "Your top-performing product. Ensure adequate stock levels.",
      icon: "🏆",
      priority: "medium",
      metric: `${top.totalSold} units sold — ${formatCurrency(top.totalRevenue)} revenue`,
    });
  }

  const wholesalerData = buyers.find((b) => b.buyerType === "WHOLESALER");
  if (wholesalerData && wholesalerData.count > 0) {
    insights.push({
      title: "Wholesaler Sales Active",
      description: "Wholesale transactions are contributing to revenue.",
      icon: "🏭",
      priority: "low",
      metric: `${wholesalerData.count} wholesale orders — ${formatCurrency(wholesalerData.revenue)}`,
    });
  }

  if (staff.length > 0) {
    const topStaff = staff[0];
    insights.push({
      title: `Top Performer: ${topStaff.staffName}`,
      description: "Your highest-generating staff member this period.",
      icon: "⭐",
      priority: "low",
      metric: `${topStaff.totalSales} sales — ${formatCurrency(topStaff.totalRevenue)}`,
    });
  }

  insights.push({
    title: "Restock Low-Stock Items",
    description: "Some products are running low. Review inventory to prevent lost sales.",
    icon: "📦",
    priority: "medium",
    metric: "Check inventory dashboard for alerts",
  });

  return insights.slice(0, 6);
}
