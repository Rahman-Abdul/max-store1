"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download, BarChart3, TrendingUp, Users, Package,
  Calendar, FileText, Eye, Loader2, ChevronRight
} from "lucide-react";
import { SaleDetailModal } from "@/components/modals/sale-detail-modal";

type ReportType = "sales" | "staff" | "inventory";
type Period = "this_week" | "7d" | "30d" | "90d" | "custom";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "this_week", label: "This Week" },
  { value: "7d",        label: "Last 7 Days" },
  { value: "30d",       label: "Last 30 Days" },
  { value: "90d",       label: "Last 90 Days" },
  { value: "custom",    label: "Custom Range" },
];

function getDateRange(period: Period) {
  const now   = new Date();
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  let start   = new Date(now);
  if (period === "this_week") {
    const day = now.getDay(); // 0=Sun
    start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    start.setDate(now.getDate() - 7); start.setHours(0,0,0,0);
  } else if (period === "30d") {
    start.setDate(now.getDate() - 30); start.setHours(0,0,0,0);
  } else if (period === "90d") {
    start.setDate(now.getDate() - 90); start.setHours(0,0,0,0);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate:   end.toISOString().split("T")[0],
  };
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [period, setPeriod]         = useState<Period>("this_week");
  const [startDate, setStartDate]   = useState(getDateRange("this_week").startDate);
  const [endDate, setEndDate]       = useState(getDateRange("this_week").endDate);
  const [generated, setGenerated]   = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      const { startDate: s, endDate: e } = getDateRange(p);
      setStartDate(s); setEndDate(e);
    }
    setGenerated(false);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", reportType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: reportType, startDate, endDate });
      const res = await fetch(`/api/reports?${params}`);
      return res.json();
    },
    enabled: generated,
  });
  const rows = data?.data || [];

  // ── This Week's clickable sales ─────────────────────────
  const { data: weekSalesData } = useQuery({
    queryKey: ["week-sales"],
    queryFn: async () => {
      const { startDate: s, endDate: e } = getDateRange("this_week");
      const res = await fetch(`/api/sales?startDate=${s}&endDate=${e}&limit=100`);
      return res.json();
    },
  });
  const weekSales = weekSalesData?.data || [];
  const weekRevenue = weekSales.filter((s: any) => s.status === "COMPLETED").reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
  const weekProfit  = weekSales.filter((s: any) => s.status === "COMPLETED").reduce((sum: number, s: any) => sum + Number(s.totalProfit), 0);

  const generateReport = () => {
    setGenerated(true);
    refetch();
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]).join(",");
    const body    = rows.map((r: any) => Object.values(r).map(v => `"${v}"`).join(",")).join("\n");
    const blob    = new Blob([headers + "\n" + body], { type: "text/csv" });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement("a");
    a.href = url; a.download = `${reportType}-${startDate}-${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 297, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("EnterprisePOS — Business Report", 10, 13);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Type: ${reportType.toUpperCase()}  |  Period: ${startDate} to ${endDate}  |  Generated: ${new Date().toLocaleString()}`, 10, 19);

      if (!rows.length) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(12);
        doc.text("No data found for the selected period.", 10, 40);
      } else {
        const cols = Object.keys(rows[0]);
        const tableData = rows.map((r: any) =>
          cols.map(k => {
            const v = r[k];
            if (typeof v === "number" && (k.toLowerCase().includes("revenue") || k.toLowerCase().includes("profit") || k.toLowerCase().includes("amount") || k.toLowerCase().includes("cost"))) {
              return formatCurrency(v);
            }
            return v === null || v === undefined ? "—" : String(v);
          })
        );

        autoTable(doc, {
          head: [cols.map(k => k.replace(/([A-Z])/g, " $1").trim().toUpperCase())],
          body: tableData,
          startY: 25,
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          margin: { left: 10, right: 10 },
        });

        // Summary footer
        const finalY = (doc as any).lastAutoTable.finalY + 5;
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Total records: ${rows.length}`, 10, finalY);
      }

      doc.save(`${reportType}-report-${startDate}-${endDate}.pdf`);
      toast.success("PDF downloaded");
    } catch (err: any) {
      toast.error("PDF generation failed: " + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  const reportTypes = [
    { id: "sales",     label: "Sales Report",      icon: TrendingUp, desc: "Daily revenue & profit breakdown" },
    { id: "staff",     label: "Staff Performance", icon: Users,      desc: "Revenue & sales per staff member" },
    { id: "inventory", label: "Inventory Report",  icon: Package,    desc: "Stock movement & product activity" },
  ];

  const statusColor: Record<string, string> = {
    PENDING: "badge-warning", CONFIRMED: "badge-info",
    COMPLETED: "badge-success", CANCELLED: "badge-danger",
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate, view, and export business reports</p>
        </div>
        {generated && rows.length > 0 && (
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
              <Download size={14} /> CSV
            </button>
            <button onClick={exportPDF} disabled={exportingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 disabled:opacity-60 transition-colors">
              {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {exportingPdf ? "Generating…" : "Export PDF"}
            </button>
          </div>
        )}
      </div>

      {/* ── THIS WEEK'S SALES (always visible, clickable) ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            <h2 className="font-semibold">This Week's Sales</h2>
            <span className="badge badge-info text-xs">{weekSales.length} orders</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">Revenue: <span className="font-semibold text-foreground">{formatCurrency(weekRevenue)}</span></span>
            <span className="text-muted-foreground">Profit: <span className="font-semibold text-emerald-600">{formatCurrency(weekProfit)}</span></span>
          </div>
        </div>
        {weekSales.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
            No sales this week yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Date</th><th>Staff</th><th>Customer</th><th>Items</th><th>Amount</th><th>Profit</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {weekSales.map((s: any) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedSale(s)}>
                    <td><span className="font-mono font-bold text-primary tracking-widest">{s.orderCode}</span></td>
                    <td className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                    <td className="text-sm">{s.staff?.name}</td>
                    <td className="text-sm">{s.customer?.name || <span className="text-muted-foreground">Walk-in</span>}</td>
                    <td className="text-sm text-muted-foreground">{s.items?.length || 0}</td>
                    <td className="font-semibold text-sm">{formatCurrency(s.totalAmount)}</td>
                    <td className={cn("font-medium text-sm", Number(s.totalProfit) >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {formatCurrency(s.totalProfit)}
                    </td>
                    <td><span className={cn("badge text-xs", statusColor[s.status] || "badge-neutral")}>{s.status}</span></td>
                    <td><ChevronRight size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── REPORT GENERATOR ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2"><BarChart3 size={16} className="text-muted-foreground" /> Generate Custom Report</h2>

        {/* Report type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {reportTypes.map(({ id, label, icon: Icon, desc }) => (
            <button key={id} onClick={() => { setReportType(id as ReportType); setGenerated(false); }}
              className={cn("text-left p-4 rounded-xl border-2 transition-all",
                reportType === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-2",
                reportType === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon size={16} />
              </div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* Period */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Period</p>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(o => (
              <button key={o.value} onClick={() => handlePeriodChange(o.value)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                  period === o.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                {o.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex gap-3 mt-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">End</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" />
              </div>
            </div>
          )}
        </div>

        <button onClick={generateReport} disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <BarChart3 size={15} />}
          {isLoading ? "Generating…" : "Generate Report"}
        </button>
      </div>

      {/* ── RESULTS ── */}
      {generated && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">{reportTypes.find(r => r.id === reportType)?.label}</h3>
            <span className="text-sm text-muted-foreground">{rows.length} records · {formatDate(startDate)} – {formatDate(endDate)}</span>
          </div>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-primary" />
              <p>Generating report…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
              <p>No data found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>{Object.keys(rows[0]).map(k => <th key={k}>{k.replace(/([A-Z])/g, " $1").trim()}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((row: any, i: number) => (
                    <tr key={i}>
                      {Object.entries(row).map(([k, v]: any) => (
                        <td key={k} className="text-sm">
                          {typeof v === "number" && (k.includes("evenue") || k.includes("rofit") || k.includes("ost") || k.includes("mount"))
                            ? formatCurrency(v)
                            : String(v ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sale detail modal */}
      {selectedSale && (
        <SaleDetailModal sale={selectedSale} open={!!selectedSale} onOpenChange={() => setSelectedSale(null)} />
      )}
    </div>
  );
}
