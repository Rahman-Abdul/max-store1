"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDebts, recordDebtPayment } from "@/actions/operations";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CreditCard, Search, CheckCircle2, Clock, RefreshCw,
  Plus, X, Loader2, User, DollarSign, AlertCircle, ChevronDown
} from "lucide-react";
import Link from "next/link";

export default function DebtsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("unpaid");
  const [page, setPage] = useState(1);
  const [paymentModal, setPaymentModal] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["debts", filter, page],
    queryFn: () =>
      getDebts({
        isPaid: filter === "all" ? undefined : filter === "paid",
        page,
        limit: 20,
      }),
  });

  const debts = data?.data || [];
  const pagination = data?.pagination;

  const totalOutstanding = debts
    .filter((d: any) => !d.isPaid)
    .reduce((s: number, d: any) => s + Number(d.balance), 0);

  const totalDebt = debts
    .filter((d: any) => !d.isPaid)
    .reduce((s: number, d: any) => s + Number(d.amount), 0);

  const handlePaymentSuccess = () => {
    setPaymentModal(null);
    qc.invalidateQueries({ queryKey: ["debts"] });
    toast.success("Debt payment recorded");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Debt Management</h1>
          <p className="page-subtitle">Track customer credit purchases and outstanding balances</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilter("unpaid")}
          className={cn("stat-card", filter === "unpaid" && "border-red-500/50 bg-red-500/5")}
        >
          <div className="p-2 bg-red-600 rounded-xl w-fit">
            <AlertCircle size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3 text-red-600">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-sm text-muted-foreground">Outstanding Balance</p>
        </div>
        <div className="stat-card">
          <div className="p-2 bg-amber-600 rounded-xl w-fit">
            <CreditCard size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">
            {debts.filter((d: any) => !d.isPaid).length}
          </p>
          <p className="text-sm text-muted-foreground">Active Debts</p>
        </div>
        <div
          onClick={() => setFilter("paid")}
          className={cn("stat-card", filter === "paid" && "border-green-500/50 bg-green-500/5")}
        >
          <div className="p-2 bg-green-600 rounded-xl w-fit">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3 text-green-600">
            {debts.filter((d: any) => d.isPaid).length}
          </p>
          <p className="text-sm text-muted-foreground">Fully Paid</p>
        </div>
        <div
          onClick={() => setFilter("all")}
          className={cn("stat-card", filter === "all" && "border-primary/50 bg-primary/5")}
        >
          <div className="p-2 bg-blue-600 rounded-xl w-fit">
            <DollarSign size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">{pagination?.total || 0}</p>
          <p className="text-sm text-muted-foreground">Total Records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["all", "unpaid", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors">
          <RefreshCw size={15} className="text-muted-foreground" />
        </button>
      </div>

      {/* Debts table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 skeleton rounded-lg" />
              ))}
            </div>
          ) : debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CreditCard size={48} className="mb-3 opacity-30" />
              <p className="font-medium">No debts found</p>
              <p className="text-sm mt-1">No credit purchases recorded</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Order</th>
                  <th>Original Amount</th>
                  <th>Balance Due</th>
                  <th>Payments Made</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt: any) => {
                  const paid = Number(debt.amount) - Number(debt.balance);
                  const percentPaid = Number(debt.amount) > 0
                    ? (paid / Number(debt.amount)) * 100
                    : 0;

                  return (
                    <tr key={debt.id}>
                      <td>
                        <Link
                          href={`/dashboard/customers/${debt.customer?.id}`}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {debt.customer?.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{debt.customer?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{debt.customer?.phone}</p>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {debt.sale ? (
                          <Link
                            href={`/dashboard/sales/${debt.sale.id || ""}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {debt.sale.orderCode}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="font-medium text-sm">{formatCurrency(debt.amount)}</td>
                      <td>
                        <p className={cn(
                          "font-bold text-sm",
                          debt.isPaid ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(debt.balance)}
                        </p>
                        {/* Progress bar */}
                        <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              debt.isPaid ? "bg-green-500" : "bg-red-400"
                            )}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <p className="text-sm">{formatCurrency(paid)}</p>
                        <p className="text-xs text-muted-foreground">
                          {debt.payments?.length || 0} payment{debt.payments?.length !== 1 ? "s" : ""}
                        </p>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {debt.dueDate ? (
                          <span className={cn(
                            new Date(debt.dueDate) < new Date() && !debt.isPaid
                              ? "text-red-600 font-medium"
                              : ""
                          )}>
                            {formatDate(debt.dueDate)}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          debt.isPaid ? "badge-success" : "badge-danger"
                        )}>
                          {debt.isPaid ? "Paid" : "Outstanding"}
                        </span>
                      </td>
                      <td>
                        {!debt.isPaid && (
                          <button
                            onClick={() => setPaymentModal(debt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors"
                          >
                            <Plus size={12} /> Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">{pagination.total} total records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <DebtPaymentModal
          debt={paymentModal}
          onClose={() => setPaymentModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

function DebtPaymentModal({ debt, onClose, onSuccess }: { debt: any; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(Number(debt.balance)));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > Number(debt.balance)) {
      toast.error("Amount cannot exceed balance due");
      return;
    }

    setLoading(true);
    try {
      await recordDebtPayment({
        debtId: debt.id,
        customerId: debt.customerId,
        amount: amt,
        method: method as any,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to record payment", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="font-bold">Record Debt Payment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-5">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold">
              {debt.customer?.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-semibold text-sm">{debt.customer?.name}</p>
              <p className="text-xs text-muted-foreground">
                Balance due: <span className="text-red-600 font-semibold">{formatCurrency(debt.balance)}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Payment Amount (₦) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              max={Number(debt.balance)}
              step="0.01"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-lg font-bold"
              required
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(String(Number(debt.balance)))}
                className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Full Balance
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(Number(debt.balance) / 2)))}
                className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Half
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Payment Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none"
            >
              <option value="CASH">💵 Cash</option>
              <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
              <option value="POS_TERMINAL">💳 POS Terminal</option>
              <option value="MOBILE_MONEY">📱 Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction reference (optional)"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
