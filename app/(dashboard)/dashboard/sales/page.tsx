"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesHistory } from "@/actions/sales";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Search, Filter, Download, RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SaleDetailModal } from "@/components/modals/sale-detail-modal";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusStyle: Record<string, string> = {
  PENDING: "badge-warning",
  CONFIRMED: "badge-info",
  COMPLETED: "badge-success",
  CANCELLED: "badge-danger",
  REFUNDED: "badge-danger",
};

export default function SalesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["sales", search, status, startDate, endDate, page],
    queryFn: () => getSalesHistory({
      search: search || undefined,
      status: status as any || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page, limit: 25,
    }),
  });

  const sales = data?.data || [];
  const pagination = data?.pagination;

  const totalRevenue = sales.filter((s: any) => s.status === "COMPLETED")
    .reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
  const totalProfit = sales.filter((s: any) => s.status === "COMPLETED")
    .reduce((sum: number, s: any) => sum + Number(s.totalProfit), 0);

  const exportCSV = () => {
    const rows = [
      ["Order Code","Date","Staff","Customer","Status","Payment","Amount","Profit"],
      ...sales.map((s: any) => [
        s.orderCode, formatDateTime(s.createdAt), s.staff?.name,
        s.customer?.name || "Walk-in", s.status, s.paymentMethod,
        Number(s.totalAmount), Number(s.totalProfit),
      ])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">{pagination?.total || 0} total transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Showing", value: sales.length, sub: "results" },
          { label: "Completed Revenue", value: formatCurrency(totalRevenue), sub: "from completed" },
          { label: "Total Profit", value: formatCurrency(totalProfit), sub: "from completed" },
          { label: "Pending", value: sales.filter((s: any) => s.status === "PENDING").length, sub: "awaiting cashier" },
        ].map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => { setStatus(tab.value); setPage(1); }}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
              status === tab.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order code or customer..."
            className="form-input pl-9 w-full" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="form-input" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="form-input" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Code</th><th>Date</th><th>Staff</th>
                <th>Customer</th><th>Items</th><th>Amount</th>
                <th>Profit</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No sales found</td></tr>
              ) : (
                sales.map((s: any) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                    <td>
                      <span className="font-mono font-bold text-primary tracking-widest text-base">{s.orderCode}</span>
                    </td>
                    <td className="text-muted-foreground text-xs">{formatDateTime(s.createdAt)}</td>
                    <td>{s.staff?.name}</td>
                    <td>{s.customer?.name || <span className="text-muted-foreground">Walk-in</span>}</td>
                    <td className="text-muted-foreground">{s.items?.length || 0} item{s.items?.length !== 1 ? "s" : ""}</td>
                    <td className="font-semibold">{formatCurrency(s.totalAmount)}</td>
                    <td className={cn("font-medium", Number(s.totalProfit) >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {formatCurrency(s.totalProfit)}
                    </td>
                    <td><span className={cn("badge text-xs", statusStyle[s.status] || "badge-neutral")}>{s.status}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <Link href={`/dashboard/sales/${s.id}`} className="p-1.5 hover:bg-muted rounded-lg inline-flex transition-colors">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border text-sm">
            <p className="text-muted-foreground">
              {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <SaleDetailModal sale={selected} open={!!selected} onOpenChange={() => setSelected(null)} />
    </div>
  );
}
