"use client";

import { useState, useRef, useEffect } from "react";
import { confirmSalePayment } from "@/actions/sales";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, CheckCircle2, Loader2, X, RefreshCw, List,
  Clock, Wrench, LayoutDashboard, History, TrendingUp,
  AlertCircle, ReceiptText, ChevronLeft, ChevronRight,
  Banknote, Percent, Plus, Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ReceiptModal } from "@/components/receipts/receipt-modal";

type Tab = "dashboard" | "queue" | "repairs" | "lookup" | "history";

interface DashboardStats {
  todayRevenue: number;
  todayProfit: number;
  todayTransactions: number;
  pendingOrders: number;
  pendingRefunds: number;
}

interface SplitEntry {
  method: string;
  amount: string;
}

const PAYMENT_METHODS = [
  { value: "CASH",          label: "💵 Cash",          color: "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" },
  { value: "BANK_TRANSFER", label: "🏦 Bank Transfer", color: "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" },
  { value: "POS_TERMINAL",  label: "💳 POS Terminal",  color: "bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100" },
  { value: "MOBILE_MONEY",  label: "📱 Mobile Money",  color: "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100" },
  { value: "CREDIT",        label: "🏷️ Credit",       color: "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" },
  { value: "SPLIT",         label: "🔀 Split",         color: "bg-pink-50 border-pink-300 text-pink-700 hover:bg-pink-100" },
];

const SPLIT_OPTIONS = [
  { value: "CASH",          label: "💵 Cash" },
  { value: "BANK_TRANSFER", label: "🏦 Bank Transfer" },
  { value: "POS_TERMINAL",  label: "💳 POS Terminal" },
  { value: "MOBILE_MONEY",  label: "📱 Mobile Money" },
  { value: "CREDIT",        label: "🏷️ Credit/Debit Card" },
];

// ── Split Payment Panel ───────────────────────────────────────────────────────
function SplitPaymentPanel({ total, splits, onChange }: {
  total: number; splits: SplitEntry[]; onChange: (s: SplitEntry[]) => void;
}) {
  const splitTotal = splits.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const remaining  = total - splitTotal;

  const addRow = () => {
    const used = splits.map(s => s.method);
    const next = SPLIT_OPTIONS.find(m => !used.includes(m.value))?.value ?? "CASH";
    onChange([...splits, { method: next, amount: "" }]);
  };

  const removeRow    = (i: number) => onChange(splits.filter((_, idx) => idx !== i));
  const updateMethod = (i: number, method: string) => onChange(splits.map((s, idx) => idx === i ? { ...s, method } : s));
  const updateAmount = (i: number, amount: string) => onChange(splits.map((s, idx) => idx === i ? { ...s, amount } : s));
  const fillRemaining = (i: number) => {
    const otherTotal = splits.reduce((s, e, idx) => idx === i ? s : s + (parseFloat(e.amount) || 0), 0);
    updateAmount(i, Math.max(0, total - otherTotal).toFixed(2));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Split Payment Breakdown</p>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full",
          Math.abs(remaining) < 0.01 ? "bg-emerald-100 text-emerald-700"
            : remaining > 0 ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-600"
        )}>
          {Math.abs(remaining) < 0.01 ? "✓ Balanced"
            : remaining > 0 ? `${formatCurrency(remaining)} remaining`
            : `${formatCurrency(Math.abs(remaining))} over`}
        </span>
      </div>

      <div className="space-y-2">
        {splits.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={entry.method} onChange={e => updateMethod(i, e.target.value)}
              className="flex-1 form-input text-sm py-2">
              {SPLIT_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">₦</span>
              <input type="number" min="0" step="0.01" value={entry.amount}
                onChange={e => updateAmount(i, e.target.value)}
                placeholder="0.00"
                className="form-input pl-7 w-full text-sm py-2 font-semibold" />
            </div>
            {remaining > 0 && (
              <button type="button" onClick={() => fillRemaining(i)}
                className="px-2 py-2 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium">
                Fill
              </button>
            )}
            {splits.length > 2 && (
              <button type="button" onClick={() => removeRow(i)}
                className="p-2 text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {splits.length < SPLIT_OPTIONS.length && (
        <button type="button" onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Plus size={13} /> Add payment method
        </button>
      )}

      <div className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-sm border border-border">
        {splits.map((entry, i) =>
          parseFloat(entry.amount) > 0 && (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>{SPLIT_OPTIONS.find(m => m.value === entry.method)?.label ?? entry.method}</span>
              <span className="font-medium text-foreground">{formatCurrency(parseFloat(entry.amount))}</span>
            </div>
          )
        )}
        <div className="flex justify-between font-bold border-t border-border pt-1.5 mt-1">
          <span>Total Paid</span>
          <span className={cn(Math.abs(remaining) < 0.01 ? "text-emerald-600" : "text-amber-600")}>
            {formatCurrency(splitTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, color, onClick }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={cn(
      "bg-card border border-border rounded-xl p-5 flex items-start gap-4",
      onClick && "cursor-pointer hover:shadow-md hover:border-primary/30 transition-all",
    )}>
      <div className={cn("p-2.5 rounded-xl", color)}><Icon className="h-5 w-5" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CashierPage() {
  const [tab, setTab]                     = useState<Tab>("dashboard");
  const [orderCode, setOrderCode]         = useState("");
  const [sale, setSale]                   = useState<any>(null);
  const [repair, setRepair]               = useState<any>(null);
  const [loading, setLoading]             = useState(false);
  const [confirming, setConfirming]       = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid]       = useState("");
  const [paymentRef, setPaymentRef]       = useState("");
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [splits, setSplits]               = useState<SplitEntry[]>([
    { method: "CASH", amount: "" },
    { method: "BANK_TRANSFER", amount: "" },
  ]);
  const [historyPage, setHistoryPage]     = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyDraft, setHistoryDraft]   = useState("");

  const inputRef   = useRef<HTMLInputElement>(null);
  const isSplit    = paymentMethod === "SPLIT";
  const splitTotal = splits.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const { data: statsData,  refetch: refetchStats   } = useQuery({
    queryKey: ["cashier-stats"],
    queryFn: () => fetch("/api/cashier/stats").then(r => r.json()),
    refetchInterval: 30_000,
  });
  const { data: queueData,  refetch: refetchQueue   } = useQuery({
    queryKey: ["cashier-pending"],
    queryFn: () => fetch("/api/cashier").then(r => r.json()),
    refetchInterval: 8_000,
  });
  const { data: repairQueue, refetch: refetchRepairs } = useQuery({
    queryKey: ["cashier-repairs"],
    queryFn: () => fetch("/api/repairs?status=READY").then(r => r.json()),
    refetchInterval: 8_000,
  });
  const { data: historyData, refetch: refetchHistory, isFetching: historyLoading } = useQuery({
    queryKey: ["cashier-history", historyPage, historySearch, historyTypeFilter],
    queryFn: () => fetch(`/api/sales/history?page=${historyPage}&limit=20&search=${encodeURIComponent(historySearch)}${historyTypeFilter ? `&type=${historyTypeFilter}` : ""}`).then(r => r.json()),
    enabled: tab === "history",
  });

  const stats: DashboardStats = statsData?.data || { todayRevenue: 0, todayProfit: 0, todayTransactions: 0, pendingOrders: 0, pendingRefunds: 0 };
  const queue       = queueData?.data   || [];
  const repairs     = repairQueue?.data || [];
  const history     = historyData?.data || [];
  // Handle both /api/cashier/history (meta) and /api/sales/history (pagination) response shapes
  const historyMeta = historyData?.meta
    ?? (historyData?.pagination
      ? { total: historyData.pagination.total, pages: historyData.pagination.totalPages }
      : { total: 0, pages: 1 });

  useEffect(() => { if (tab === "lookup" && inputRef.current) inputRef.current.focus(); }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => { setHistorySearch(historyDraft); setHistoryPage(1); }, 350);
    return () => clearTimeout(t);
  }, [historyDraft]);

  // When switching TO split, reset splits with empty amounts
  useEffect(() => {
    if (!isSplit) return;
    setSplits([{ method: "CASH", amount: "" }, { method: "BANK_TRANSFER", amount: "" }]);
  }, [isSplit]);

  const refetchAll = () => { refetchStats(); refetchQueue(); refetchRepairs(); if (tab === "history") refetchHistory(); };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "badge-warning", CONFIRMED: "badge-info",
      COMPLETED: "badge-success", CANCELLED: "badge-danger", READY: "badge-success",
    };
    return cn("badge text-xs", map[status] || "badge-neutral");
  };

  // ── Lookup ────────────────────────────────────────────────────────────────
  const handleSearch = async (code?: string) => {
    const lookup = (code || orderCode).trim().toUpperCase();
    if (!lookup) return;
    setLoading(true); setSale(null); setRepair(null);
    try {
      const saleRes  = await fetch(`/api/cashier?orderCode=${lookup}`);
      const saleData = await saleRes.json();
      if (saleData.success && saleData.data) {
        const s = saleData.data;
        if (s.status === "COMPLETED") { toast.error("Already completed"); setLoading(false); return; }
        if (s.status === "CANCELLED") { toast.error("Order was cancelled"); setLoading(false); return; }
        setSale(s);
        setAmountPaid(String(Number(s.totalAmount)));
        setPaymentMethod(s.paymentMethod || "CASH");
        setSplits([{ method: "CASH", amount: "" }, { method: "BANK_TRANSFER", amount: "" }]);
        setTab("lookup"); setLoading(false); return;
      }
      const repairRes  = await fetch(`/api/repairs?search=${lookup}`);
      const repairData = await repairRes.json();
      const found      = repairData.data?.find((r: any) => r.orderCode === lookup);
      if (found) {
        setRepair(found);
        setAmountPaid(String(Number(found.totalAmount)));
        setPaymentMethod("CASH");
        setSplits([{ method: "CASH", amount: "" }, { method: "BANK_TRANSFER", amount: "" }]);
        setTab("lookup");
      } else {
        toast.error(`No order or repair found with code "${lookup}"`);
      }
    } catch { toast.error("Failed to find order"); }
    finally { setLoading(false); }
  };

  // ── Confirm Sale ─────────────────────────────────────────────────────────
  const handleConfirmSale = async () => {
    if (!sale) return;
    let finalAmount: number;
    let finalMethod  = paymentMethod;
    let finalRef     = paymentRef;

    if (isSplit) {
      const balanced = Math.abs(splitTotal - Number(sale.totalAmount)) < 0.01;
      if (!balanced) { toast.error(`Split must equal ${formatCurrency(Number(sale.totalAmount))}`); return; }
      finalAmount = splitTotal;
      finalRef    = splits.filter(s => parseFloat(s.amount) > 0)
        .map(s => `${s.method}: ${formatCurrency(parseFloat(s.amount))}`).join(" | ");
      finalMethod = "SPLIT";
    } else {
      finalAmount = parseFloat(amountPaid);
      if (isNaN(finalAmount) || finalAmount <= 0) { toast.error("Enter valid amount"); return; }
    }

    setConfirming(true);
    try {
      const result = await confirmSalePayment(sale.id, finalAmount, finalMethod as any, finalRef || undefined);
      if (result.success) {
        toast.success(`✅ Payment confirmed! Receipt: ${result.receiptNo}`);
        const fullSale = await fetch(`/api/cashier?orderCode=${sale.orderCode}`).then(r => r.json());
        setCompletedSale({
          ...fullSale.data, receiptNo: result.receiptNo,
          amountPaid: finalAmount, paymentMethod: finalMethod,
          splitDetails: isSplit ? splits.filter(s => parseFloat(s.amount) > 0) : undefined,
        });
        setSale(null); setOrderCode(""); setAmountPaid(""); setPaymentRef("");
        setSplits([{ method: "CASH", amount: "" }, { method: "BANK_TRANSFER", amount: "" }]);
        refetchQueue(); refetchStats(); setTab("queue");
      }
    } catch (e: any) { toast.error(e.message || "Failed to confirm"); }
    finally { setConfirming(false); }
  };

  // ── Confirm Repair ───────────────────────────────────────────────────────
  const handleConfirmRepair = async () => {
    if (!repair) return;
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid <= 0) { toast.error("Enter valid amount"); return; }
    setConfirming(true);
    try {
      const res  = await fetch(`/api/repairs/${repair.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", amountPaid: paid, paymentMethod, cashierId: "me" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Repair payment confirmed!");
        setCompletedSale({
          orderCode: repair.orderCode, receiptNo: `REP-${repair.orderCode}`,
          shop: repair.shop, staff: repair.staff, cashier: repair.cashier,
          customer: { name: repair.customerName, phone: repair.customerPhone },
          items: repair.partsUsed?.map((p: any) => ({
            productName: p.name, quantity: p.quantity, sellingPrice: p.unitCost, totalAmount: p.totalCost,
          })) || [],
          totalAmount: repair.totalAmount, discount: 0,
          amountPaid: paid, paymentMethod, confirmedAt: new Date().toISOString(),
          buyerType: "REGULAR_BUYER",
          notes: `Repair: ${repair.deviceType} — ${repair.issueDesc}`,
        });
        setRepair(null); setOrderCode(""); setAmountPaid(""); setPaymentRef("");
        refetchRepairs(); refetchStats(); setTab("queue");
      }
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setConfirming(false); }
  };

  const handleReject = async () => {
    if (!sale || !confirm("Reject this order?")) return;
    await fetch(`/api/sales/${sale.id}/cancel`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Rejected at cashier" }),
    });
    toast.success("Order rejected"); setSale(null); setOrderCode(""); refetchQueue(); refetchStats();
  };

  const handleRegenerateReceipt = (s: any) => {
    const amtPaid = s.payments?.[0]?.amount ?? s.totalAmount;
    setCompletedSale({
      ...s,
      receiptNo: s.receipt?.receiptNo ?? s.orderCode,
      amountPaid: Number(amtPaid),
      paymentMethod: s.payments?.[0]?.method ?? s.paymentMethod ?? "CASH",
      items: s.items?.map((item: any) => ({
        productName: item.product?.name ?? item.productName,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice ?? item.unitPrice,
        totalAmount: item.totalAmount ?? item.subtotal,
      })),
    });
  };

  const currentOrder  = sale || repair;
  const total         = currentOrder ? Number(currentOrder.totalAmount) : 0;
  const paid          = isSplit ? splitTotal : (parseFloat(amountPaid) || 0);
  const change        = paid - total;
  const splitBalanced = isSplit && Math.abs(splitTotal - total) < 0.01;
  const canConfirm    = isSplit ? splitBalanced : paid >= total;
  const profitMargin  = stats.todayRevenue > 0
    ? ((stats.todayProfit / stats.todayRevenue) * 100).toFixed(1) : "0.0";

  const TABS: { id: Tab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard",    Icon: LayoutDashboard },
    { id: "queue",     label: "Sales Queue",  Icon: List,   badge: queue.length },
    { id: "repairs",   label: "Repair Queue", Icon: Wrench, badge: repairs.length },
    { id: "lookup",    label: "Look Up",      Icon: Search },
    { id: "history",   label: "History",      Icon: History },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cashier Desk</h1>
          <p className="page-subtitle">Confirm payments · view history · track today's performance</p>
        </div>
        <button onClick={refetchAll} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, Icon, badge }) => (
          <button key={id} onClick={() => setTab(id)} className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
          )}>
            <Icon className="h-4 w-4" />{label}
            {badge != null && badge > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)}
              sub={`${stats.todayTransactions} transaction${stats.todayTransactions !== 1 ? "s" : ""}`}
              icon={Banknote} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600" />
            <StatCard title="Today's Profit" value={formatCurrency(stats.todayProfit)}
              sub={`${profitMargin}% margin`}
              icon={TrendingUp} color="bg-blue-100 dark:bg-blue-900/40 text-blue-600" />
            <StatCard title="Profit Margin" value={`${profitMargin}%`} sub="on completed sales"
              icon={Percent} color="bg-violet-100 dark:bg-violet-900/40 text-violet-600" />
            <StatCard title="Pending Orders" value={stats.pendingOrders} sub="awaiting payment"
              icon={Clock} color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" onClick={() => setTab("queue")} />
            <StatCard title="Pending Refunds" value={stats.pendingRefunds} sub="cancelled, not refunded"
              icon={AlertCircle} color="bg-red-100 dark:bg-red-900/40 text-red-600" />
            <StatCard title="Ready Repairs" value={repairs.length} sub="awaiting pickup"
              icon={Wrench} color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600" onClick={() => setTab("repairs")} />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-semibold mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setTab("lookup")}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Search className="h-4 w-4" /> Look Up Order
              </button>
              <button onClick={() => setTab("queue")}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                <List className="h-4 w-4" /> View Sales Queue
                {queue.length > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{queue.length}</span>}
              </button>
              <button onClick={() => setTab("history")}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                <History className="h-4 w-4" /> Sales History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SALES QUEUE ══ */}
      {tab === "queue" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Pending Sales ({queue.length})</div>
          {queue.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>No pending orders</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {queue.map((s: any) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-mono font-bold text-primary tracking-widest">{s.orderCode}</span>
                      <span className={statusBadge(s.status)}>{s.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.staff?.name} · {formatDateTime(s.createdAt)}{s.customer ? ` · ${s.customer.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(s.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">{s.items?.length} item{s.items?.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => handleSearch(s.orderCode)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    <CheckCircle2 className="h-4 w-4" /> Process
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ REPAIR QUEUE ══ */}
      {tab === "repairs" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Ready Repairs ({repairs.length})</div>
          {repairs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>No repairs ready for pickup</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {repairs.map((r: any) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-mono font-bold text-primary tracking-widest">{r.orderCode}</span>
                      <span className="badge badge-success text-xs">READY</span>
                    </div>
                    <p className="text-sm font-medium">{r.customerName} · {r.deviceType}</p>
                    <p className="text-xs text-muted-foreground">{r.issueDesc}</p>
                  </div>
                  <div className="text-right"><p className="font-bold">{formatCurrency(r.totalAmount)}</p></div>
                  <button onClick={() => handleSearch(r.orderCode)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    <CheckCircle2 className="h-4 w-4" /> Process
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ LOOKUP ══ */}
      {tab === "lookup" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <label className="block text-sm font-medium mb-3">Enter 5-Character Order Code</label>
            <div className="flex gap-3">
              <input ref={inputRef} value={orderCode}
                onChange={e => setOrderCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. A3X9K" maxLength={5}
                className="flex-1 px-4 py-3 text-2xl font-mono font-bold tracking-[0.5em] text-center border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase" />
              <button onClick={() => handleSearch()} disabled={loading || orderCode.length !== 5}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} Find
              </button>
            </div>
            <div className="flex gap-2 mt-3 justify-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn(
                  "w-10 h-10 border-2 rounded-lg flex items-center justify-center text-lg font-mono font-bold transition-colors",
                  orderCode[i] ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground/30",
                )}>
                  {orderCode[i] || "·"}
                </div>
              ))}
            </div>
          </div>

          {/* Order detail */}
          {(sale || repair) && (
            <div className="bg-card border-2 border-primary/30 rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-5 py-4 border-b border-primary/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-widest text-primary">{currentOrder.orderCode}</span>
                    <span className={statusBadge(sale ? sale.status : "READY")}>
                      {sale ? sale.status : "READY FOR PICKUP"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {sale ? `${sale.staff?.name} · ${formatDateTime(sale.createdAt)}` : `${repair?.customerName} · ${repair?.deviceType}`}
                  </p>
                </div>
                <button onClick={() => { setSale(null); setRepair(null); }} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Customer info */}
                {sale && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Customer</p>
                      <p className="font-medium">{sale.customerName || sale.customer?.name || "Walk-in"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">Buyer Type</p>
                      <p className="font-medium">{sale.buyerType?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                )}
                {repair && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Customer</p>
                      <p className="font-medium">{repair.customerName}</p>
                      {repair.customerPhone && <p className="text-xs text-muted-foreground">{repair.customerPhone}</p>}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Device</p>
                      <p className="font-medium">{repair.deviceType}</p>
                      <p className="text-xs text-muted-foreground">{repair.issueDesc}</p>
                    </div>
                  </div>
                )}

                {/* Items table */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale ? sale.items : repair?.partsUsed || []).map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="font-medium">{item.productName || item.name}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{formatCurrency(item.sellingPrice || item.unitCost)}</td>
                          <td className="text-right font-semibold">{formatCurrency(item.totalAmount || item.totalCost)}</td>
                        </tr>
                      ))}
                      {repair && (
                        <tr className="bg-muted/30">
                          <td className="font-medium text-muted-foreground">Labour</td>
                          <td className="text-right">—</td>
                          <td className="text-right">—</td>
                          <td className="text-right font-semibold">{formatCurrency(repair.laborCost)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold text-xl border-t border-border pt-3">
                  <span>Total</span><span>{formatCurrency(total)}</span>
                </div>

                {/* Payment method buttons */}
                <div>
                  <p className="text-sm font-semibold mb-2">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(({ value, label, color }) => (
                      <button key={value} onClick={() => setPaymentMethod(value)}
                        className={cn(
                          "py-2 px-3 text-xs font-semibold rounded-xl border-2 transition-all",
                          paymentMethod === value ? color + " ring-2 ring-offset-1 ring-primary" : "border-border bg-card hover:bg-muted",
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split panel OR single amount */}
                {isSplit ? (
                  <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4">
                    <SplitPaymentPanel total={total} splits={splits} onChange={setSplits} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount Received *</label>
                      <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                        className="form-input text-lg font-bold w-full" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reference (optional)</label>
                      <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)}
                        className="form-input w-full" placeholder="Transfer ref..." />
                    </div>
                  </div>
                )}

                {/* Change (non-split only) */}
                {!isSplit && paid >= total && total > 0 && (
                  <div className={cn(
                    "rounded-xl p-4 text-center",
                    change > 0 ? "bg-green-50 dark:bg-green-900/20 border border-green-200" : "bg-muted",
                  )}>
                    <p className="text-xs text-muted-foreground">{change > 0 ? "Change Due" : "Exact Amount"}</p>
                    <p className={cn("text-2xl font-bold", change > 0 ? "text-green-600" : "text-foreground")}>
                      {formatCurrency(Math.max(0, change))}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  {sale && (
                    <button onClick={handleReject}
                      className="flex-1 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors">
                      Reject
                    </button>
                  )}
                  <button
                    onClick={sale ? handleConfirmSale : handleConfirmRepair}
                    disabled={confirming || !canConfirm}
                    className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {confirming ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                    {isSplit
                      ? splitBalanced ? "Confirm Split Payment" : `Balance ${formatCurrency(Math.abs(total - splitTotal))}`
                      : paid < total && total > 0
                      ? `Short by ${formatCurrency(total - paid)}`
                      : "Confirm Payment"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORY ══ */}
      {tab === "history" && (
        <div className="space-y-4">
          {/* Search + type filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input value={historyDraft} onChange={e => setHistoryDraft(e.target.value)}
                placeholder="Search by order code, product, customer…"
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm" />
            </div>
          </div>

          {/* Type filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "",         label: "All Activity",  color: "bg-muted text-foreground" },
              { key: "sale",     label: "💰 Sales",      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
              { key: "return",   label: "↩ Returns",     color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30" },
              { key: "refund",   label: "💸 Refunds",    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30" },
              { key: "exchange", label: "🔄 Exchanges",  color: "bg-violet-50 text-violet-700 dark:bg-violet-950/30" },
              { key: "damage",   label: "⚠ Damage",     color: "bg-red-50 text-red-700 dark:bg-red-950/30" },
            ].map(f => (
              <button key={f.key}
                onClick={() => { setHistoryTypeFilter(f.key); setHistoryPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  historyTypeFilter === f.key ? "border-primary ring-1 ring-primary " + f.color : "border-transparent " + f.color + " opacity-70 hover:opacity-100"
                )}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <span className="font-semibold">
                Sales & Activity History
                {historyMeta.total > 0 && <span className="ml-2 text-muted-foreground text-sm font-normal">({historyMeta.total} records)</span>}
              </span>
              {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {history.length === 0 && !historyLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>No activity found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((activity: any) => {
                  const s = activity.data;
                  const TYPE_META: Record<string, { label: string; color: string; badge: string }> = {
                    sale:     { label: "Sale",     color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40", badge: "badge-success" },
                    return:   { label: "Return",   color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40",         badge: "badge-info" },
                    refund:   { label: "Refund",   color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40",      badge: "badge-warning" },
                    exchange: { label: "Exchange", color: "bg-violet-100 text-violet-700 dark:bg-violet-950/40",   badge: "badge-neutral" },
                    damage:   { label: "Damage",   color: "bg-red-100 text-red-700 dark:bg-red-950/40",            badge: "badge-danger" },
                  };
                  const meta = TYPE_META[activity.type] || TYPE_META.sale;

                  return (
                    <div key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">

                      {/* Type indicator */}
                      <div className={cn("px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 mt-0.5 uppercase tracking-wide", meta.color)}>
                        {meta.label}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {activity.orderCode && (
                            <span className="font-mono font-bold text-primary text-sm tracking-widest">{activity.orderCode}</span>
                          )}
                          <span className={cn("badge text-[10px]", meta.badge)}>{activity.status}</span>
                          {activity.shopName && (
                            <span className="text-[10px] text-muted-foreground">{activity.shopName}</span>
                          )}
                        </div>

                        {/* Type-specific detail line */}
                        {activity.type === "sale" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.staff?.name}{s.customer?.name ? ` · ${s.customer.name}` : " · Walk-in"}
                            {" · "}{s.items?.length} items
                            {" · "}{formatDateTime(s.confirmedAt || s.createdAt)}
                          </p>
                        )}
                        {activity.type === "return" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.items?.map((i: any) => `${i.product?.name} ×${i.quantity}`).join(", ")}
                            {" · "}{s.reason}
                            {" · "}{formatDateTime(s.createdAt)}
                          </p>
                        )}
                        {activity.type === "refund" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.requestedBy?.name} · {s.reason}
                            {s.refundMethod ? ` · via ${s.refundMethod.replace(/_/g," ")}` : ""}
                            {" · "}{formatDateTime(s.createdAt)}
                          </p>
                        )}
                        {activity.type === "exchange" && (
                          <p className="text-xs text-muted-foreground truncate">
                            Returned: {s.originalProduct?.name} ×{s.quantityReturned}
                            {" → "}Given: {s.newProduct?.name} ×{s.quantityGiven}
                            {" · "}{formatDateTime(s.createdAt)}
                          </p>
                        )}
                        {activity.type === "damage" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {s.product?.name} ×{s.quantity} · {s.damageType?.replace(/_/g," ")}
                            {" · "}{s.reportedBy?.name}
                            {" · "}{formatDateTime(s.createdAt)}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        {activity.type === "sale" && (
                          <>
                            <p className="font-bold text-emerald-600">{formatCurrency(s.totalAmount)}</p>
                            {s.paymentMethod === "SPLIT" && s.payments?.[0]?.reference ? (
                              <p className="text-[10px] text-pink-600 font-medium mt-0.5">🔀 Split</p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                {s.payments?.[0]?.method?.replace(/_/g, " ") ?? s.paymentMethod ?? "—"}
                              </p>
                            )}
                          </>
                        )}
                        {activity.type === "refund" && (
                          <p className="font-bold text-amber-600">−{formatCurrency(s.amount)}</p>
                        )}
                        {activity.type === "exchange" && (
                          <div className="text-right">
                            <p className={cn("font-bold text-xs", Number(s.priceDifference) >= 0 ? "text-amber-600" : "text-emerald-600")}>
                              {Number(s.priceDifference) >= 0 ? "+" : ""}{formatCurrency(s.priceDifference)}
                            </p>
                            {Number(s.extraPayment) > 0 && (
                              <p className="text-[10px] text-muted-foreground">Paid: {formatCurrency(s.extraPayment)}</p>
                            )}
                          </div>
                        )}
                        {activity.type === "damage" && (
                          <p className="font-bold text-red-600">−{formatCurrency(s.costLoss)}</p>
                        )}
                        {activity.type === "return" && (
                          <p className="text-xs font-semibold text-blue-600">
                            {s.status === "RESTOCKED" ? "↩ Restocked" : s.status === "REJECTED" ? "✗ Rejected" : "⏳ Pending"}
                          </p>
                        )}
                      </div>

                      {/* Receipt button for sales only */}
                      {activity.type === "sale" && (
                        <button onClick={() => handleRegenerateReceipt(s)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors shrink-0">
                          <ReceiptText className="h-3.5 w-3.5" /> Receipt
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {historyMeta.pages > 1 && (
              <div className="px-5 py-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Page {historyPage} of {historyMeta.pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage <= 1}
                    className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setHistoryPage(p => Math.min(historyMeta.pages, p + 1))} disabled={historyPage >= historyMeta.pages}
                    className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt modal */}
      {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
    </div>
  );
}
