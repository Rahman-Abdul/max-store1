"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SaleDetailModal } from "@/components/modals/sale-detail-modal";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package,
  Users, AlertTriangle, RotateCcw, CreditCard, Zap, Store,
  ArrowRight, Activity, Clock, Eye
} from "lucide-react";
import { formatCurrency, formatDate, getBuyerTypeLabel, cn } from "@/lib/utils";

interface Props {
  user: any;
  stats: any;
  trend: any[];
  buyerBreakdown: any[];
  topProducts: any[];
  staffPerformance: any[];
  lowStockProducts: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({
  title, value, subValue, icon: Icon, href, color, change, prefix
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  href: string;
  color: string;
  change?: number;
  prefix?: string;
}) {
  return (
    <Link href={href} className="stat-card group block">
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon size={20} className="text-white" />
        </div>
        {change !== undefined && (
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            change >= 0
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold font-display">
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{subValue}</p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <span>View details</span>
        <ArrowRight size={12} />
      </div>
    </Link>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}: {p.name === "sales" ? p.value : formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardClient({
  user, stats, trend, buyerBreakdown, topProducts, staffPerformance, lowStockProducts,
}: Props) {
  const isAdmin = ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role);
  const isStaff = user.role === "STAFF";
  const isCashier = user.role === "CASHIER";
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const weekSales = stats?.weekSales ?? [];
  const weekRevenue = stats?.weekRevenue ?? 0;
  const weekProfit = stats?.weekProfit ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">
          {isCashier ? "Cashier Dashboard" : isStaff ? "My Sales Dashboard" : "Dashboard"}
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Cashier quick action */}
      {isCashier && (
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold font-display mb-2">Cashier Desk</h2>
          <p className="text-blue-100 text-sm mb-4">Enter an order code to confirm payment and generate receipt</p>
          <Link
            href="/dashboard/cashier"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors"
          >
            <Zap size={16} /> Open Cashier Desk
          </Link>
        </div>
      )}

      {/* Staff quick action */}
      {isStaff && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold font-display mb-2">Quick Sale</h2>
          <p className="text-blue-100 text-sm mb-4">Start a new sale from the POS terminal</p>
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors"
          >
            <Zap size={16} /> Open POS Terminal
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.today?.revenue ?? 0)}
          subValue={`${stats?.today?.sales ?? 0} sales today`}
          icon={DollarSign}
          href="/dashboard/sales"
          color="bg-blue-600"
          change={stats?.growth?.revenue}
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(stats?.today?.profit ?? 0)}
          icon={TrendingUp}
          href="/dashboard/analytics"
          color="bg-emerald-600"
          change={stats?.growth?.profit}
        />
        {!isStaff && !isCashier && (
          <>
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats?.month?.revenue ?? 0)}
              subValue={`${stats?.month?.sales ?? 0} total sales`}
              icon={Activity}
              href="/dashboard/reports"
              color="bg-violet-600"
            />
            <StatCard
              title="Outstanding Debts"
              value={formatCurrency(stats?.debts?.total ?? 0)}
              icon={CreditCard}
              href="/dashboard/debts"
              color="bg-amber-600"
            />
          </>
        )}
        {isStaff && (
          <>
            <StatCard
              title="My Total Sales"
              value={stats?.month?.sales ?? 0}
              icon={ShoppingCart}
              href="/dashboard/sales"
              color="bg-violet-600"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats?.month?.revenue ?? 0)}
              icon={Activity}
              href="/dashboard/sales"
              color="bg-amber-600"
            />
          </>
        )}
        {isCashier && (
          <>
            <StatCard
              title="Pending Orders"
              value={stats?.counts?.pendingOrders ?? 0}
              icon={ShoppingCart}
              href="/dashboard/cashier"
              color="bg-violet-600"
            />
            <StatCard
              title="Pending Refunds"
              value={stats?.counts?.pendingRefunds ?? 0}
              icon={RotateCcw}
              href="/dashboard/refunds"
              color="bg-amber-600"
            />
          </>
        )}
      </div>

      {/* Admin extra stats row */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={stats?.counts?.products ?? 0}
            icon={Package}
            href="/dashboard/inventory"
            color="bg-cyan-600"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats?.counts?.lowStock ?? 0}
            icon={AlertTriangle}
            href="/dashboard/inventory"
            color="bg-orange-600"
          />
          <StatCard
            title="Total Customers"
            value={stats?.counts?.customers ?? 0}
            icon={Users}
            href="/dashboard/customers"
            color="bg-pink-600"
          />
          <StatCard
            title="Monthly Expenses"
            value={formatCurrency(stats?.month?.expenses ?? 0)}
            icon={DollarSign}
            href="/dashboard/expenses"
            color="bg-red-600"
          />
        </div>
      )}

      {/* Charts row */}
      {!isCashier && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue trend */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">Revenue & Profit Trend</h3>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
              <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                Full Analytics <ArrowRight size={12} />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.split("-").slice(1).join("/")}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6"
                  strokeWidth={2} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981"
                  strokeWidth={2} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Buyer type breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold">Sales by Buyer Type</h3>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
            {buyerBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={buyerBreakdown} cx="50%" cy="50%" innerRadius={45}
                      outerRadius={70} paddingAngle={3} dataKey="count">
                      {buyerBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, getBuyerTypeLabel(n as string)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {buyerBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-muted-foreground">{getBuyerTypeLabel(item.buyerType)}</span>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No sales data yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom row */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top products */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold">Top Products</h3>
                <p className="text-xs text-muted-foreground">By revenue</p>
              </div>
              <Link href="/dashboard/inventory" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-border">
              {topProducts.length > 0 ? (
                topProducts.map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-2xl font-bold text-muted-foreground/30 w-6 font-display">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.productName}</p>
                      <p className="text-xs text-muted-foreground">{p.totalSold} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(p.totalRevenue)}</p>
                      <p className="text-xs text-emerald-600">{formatCurrency(p.totalProfit)} profit</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  No sales data yet
                </div>
              )}
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold">Low Stock Alerts</h3>
                <p className="text-xs text-muted-foreground">Needs restocking</p>
              </div>
              <Link href="/dashboard/inventory" className="text-xs text-primary hover:underline">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-border">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.slice(0, 5).map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/inventory/${p.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      p.stockQuantity === 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                    )}>
                      <Package size={18} className={
                        p.stockQuantity === 0 ? "text-red-600" : "text-amber-600"
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-sm font-bold",
                        p.stockQuantity === 0 ? "text-red-600" : "text-amber-600"
                      )}>
                        {p.stockQuantity === 0 ? "OUT" : p.stockQuantity}
                      </p>
                      <p className="text-xs text-muted-foreground">/ {p.lowStockThreshold}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                  All products are well stocked
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── This Week Sales ─────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <div>
              <h3 className="font-semibold">This Week&apos;s Sales</h3>
              <p className="text-xs text-muted-foreground">{weekSales.length} transactions · {formatCurrency(weekRevenue)} revenue · {formatCurrency(weekProfit)} profit</p>
            </div>
          </div>
          <Link href="/dashboard/sales" className="text-xs text-primary hover:underline flex items-center gap-1">
            All Sales <ArrowRight size={12} />
          </Link>
        </div>
        {weekSales.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>No sales this week yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Staff</th><th>Customer</th><th>Items</th><th>Amount</th><th>Profit</th><th>Status</th><th>Time</th><th className="sr-only">Details</th></tr>
              </thead>
              <tbody>
                {weekSales.slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedSale(s)}>
                    <td><span className="font-mono font-bold text-primary tracking-widest text-sm">{s.orderCode}</span></td>
                    <td className="text-sm">{s.staff?.name}</td>
                    <td className="text-sm">{s.customer?.name || <span className="text-muted-foreground">Walk-in</span>}</td>
                    <td className="text-sm text-muted-foreground">{s.items?.length || 0}</td>
                    <td className="font-semibold text-sm">{formatCurrency(s.totalAmount)}</td>
                    <td className={cn("font-medium text-sm", Number(s.totalProfit) >= 0 ? "text-emerald-600" : "text-red-500")}>{formatCurrency(s.totalProfit)}</td>
                    <td>
                      <span className={cn("badge text-xs",
                        s.status === "COMPLETED" ? "badge-success" : s.status === "PENDING" ? "badge-warning" :
                        s.status === "CONFIRMED" ? "badge-info" : "badge-danger")}>
                        {s.status}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td><Eye size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && <SaleDetailModal sale={selectedSale} open={!!selectedSale} onOpenChange={() => setSelectedSale(null)} />}

      {/* Staff performance (admin only) */}
      {isAdmin && staffPerformance.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h3 className="font-semibold">Staff Performance</h3>
              <p className="text-xs text-muted-foreground">All time rankings</p>
            </div>
            <Link href="/dashboard/staff" className="text-xs text-primary hover:underline">
              View all staff
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Total Sales</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.slice(0, 5).map((s) => (
                  <tr key={s.staffId}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {s.staffName.charAt(0)}
                        </div>
                        <span className="font-medium">{s.staffName}</span>
                      </div>
                    </td>
                    <td>{s.totalSales}</td>
                    <td className="font-medium">{formatCurrency(s.totalRevenue)}</td>
                    <td className="text-emerald-600 font-medium">{formatCurrency(s.totalProfit)}</td>
                    <td>{formatCurrency(s.averageOrder)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
