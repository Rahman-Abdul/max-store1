"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  RotateCcw, CheckCircle2, XCircle, Clock, DollarSign,
  RefreshCw, ArrowLeftRight, AlertTriangle, Package,
  Search, Plus, X, Loader2, Edit, Trash2,
  ShieldX, Boxes, ChevronDown, ChevronUp,
} from "lucide-react";

type Tab = "refunds" | "returns" | "exchanges" | "damaged";

const REFUND_BADGE: Record<string, string> = {
  PENDING: "badge-warning", APPROVED: "badge-info",
  COMPLETED: "badge-success", REJECTED: "badge-danger",
};
const RETURN_BADGE: Record<string, string> = {
  PENDING: "badge-warning", APPROVED: "badge-success",
  REJECTED: "badge-danger", RESTOCKED: "badge-info",
  CANCELLED: "badge-danger",
};

// ── Helpers ────────────────────────────────────────────────────────
function SaleSearch({ onFound, label = "Order Code" }: { onFound: (sale: any) => void; label?: string }) {
  const [code, setCode]       = useState("");
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!code.trim()) return;
    setSearching(true);
    try {
      const res  = await fetch(`/api/cashier?orderCode=${code.trim().toUpperCase()}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.status !== "COMPLETED") { toast.error("Only completed sales allowed"); return; }
        onFound(data.data);
      } else toast.error("Sale not found");
    } catch { toast.error("Failed to search"); }
    finally { setSearching(false); }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label} *</label>
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder="e.g. A3X9K" maxLength={5}
          className="flex-1 form-input font-mono tracking-widest text-center text-lg font-bold uppercase" />
        <button onClick={search} disabled={searching}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </button>
      </div>
    </div>
  );
}

// ── Request Refund Modal ───────────────────────────────────────────
function RequestRefundModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [sale, setSale]     = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!sale || !amount || !reason) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/refunds", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, amount: parseFloat(amount), reason, refundMethod: method }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Refund request submitted"); onSuccess(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold flex items-center gap-2"><DollarSign size={16} className="text-primary" /> Request Refund</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <SaleSearch onFound={s => { setSale(s); setAmount(String(Number(s.totalAmount))); }} />
          {sale && (
            <>
              <div className="bg-muted/50 rounded-xl p-3 text-sm">
                <p className="font-semibold">{sale.orderCode}</p>
                <p className="text-xs text-muted-foreground">{sale.staff?.name} · {formatDateTime(sale.createdAt)}</p>
                <p className="text-primary font-bold mt-1">{formatCurrency(sale.totalAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Refund Amount (₦) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  max={Number(sale.totalAmount)} className="form-input w-full" />
                <p className="text-[10px] text-muted-foreground mt-1">Max: {formatCurrency(sale.totalAmount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Refund Method *</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className="form-input w-full">
                  {["CASH","BANK_TRANSFER","POS_TERMINAL","MOBILE_MONEY"].map(m => (
                    <option key={m} value={m}>{m.replace(/_/g," ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  rows={3} placeholder="Why is this refund being requested?" className="form-input w-full" />
              </div>
            </>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !sale}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />} Submit Refund
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Return Modal (create + edit) ───────────────────────────────────
function ReturnModal({
  existing, onClose, onSuccess,
}: { existing?: any; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!existing;
  const [sale, setSale]           = useState<any>(existing?.sale || null);
  const [selected, setSelected]   = useState<Record<string, number>>(
    existing ? Object.fromEntries((existing.items || []).map((i: any) => [i.productId, i.quantity])) : {}
  );
  const [reason, setReason]       = useState(existing?.reason || "");
  const [notes, setNotes]         = useState(existing?.notes || "");
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async () => {
    const items = Object.entries(selected).filter(([, qty]) => qty > 0).map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length || !reason) { toast.error("Select items and enter reason"); return; }
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/returns/${existing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, notes, items }),
        });
      } else {
        res = await fetch("/api/returns", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saleId: sale.id, reason, notes, items }),
        });
      }
      const data = await res.json();
      if (data.success) { toast.success(isEdit ? "Return updated" : "Return submitted"); onSuccess(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  const saleItems = sale?.items || existing?.sale?.items || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-bold flex items-center gap-2">
            <RotateCcw size={16} className="text-primary" /> {isEdit ? "Edit Return" : "New Return"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isEdit && <SaleSearch onFound={s => { setSale(s); setSelected({}); }} />}
          {sale && !isEdit && (
            <div className="bg-muted/50 rounded-xl p-3 text-sm">
              <p className="font-semibold">{sale.orderCode} · {formatDateTime(sale.createdAt)}</p>
              <p className="text-primary font-bold">{formatCurrency(sale.totalAmount)}</p>
            </div>
          )}
          {(sale || isEdit) && (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Select items to return:</p>
                <div className="space-y-2">
                  {saleItems.map((item: any) => (
                    <div key={item.productId || item.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                      <div>
                        <p className="text-sm font-medium">{item.productName || item.product?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.productSku || item.product?.sku} · {formatCurrency(item.sellingPrice || item.costPrice)} · qty {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(s => ({ ...s, [item.productId]: Math.max(0, (s[item.productId] || 0) - 1) }))}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted-foreground/20 flex items-center justify-center font-bold">−</button>
                        <span className="w-6 text-center text-sm font-bold">{selected[item.productId] || 0}</span>
                        <button onClick={() => setSelected(s => ({ ...s, [item.productId]: Math.min(item.quantity, (s[item.productId] || 0) + 1) }))}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted-foreground/20 flex items-center justify-center font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason *</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  rows={2} placeholder="Why are these items being returned?" className="form-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Additional notes..." className="form-input w-full" />
              </div>
            </>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || (!sale && !isEdit)}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            {isEdit ? "Save Changes" : "Submit Return"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject / Cancel Return Modal ───────────────────────────────────
function RejectReturnModal({
  returnRecord, onClose, onSuccess,
}: { returnRecord: any; onClose: () => void; onSuccess: () => void }) {
  const [disposition, setDisposition] = useState<"damage" | "restock">("restock");
  const [damageType, setDamageType]   = useState("DEFECTIVE");
  const [reason, setReason]           = useState("");
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error("Enter a reason"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/returns/${returnRecord.id}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, disposition, damageType }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(disposition === "damage" ? "Return rejected — logged as damage" : "Return rejected — items restocked");
        onSuccess();
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold flex items-center gap-2"><ShieldX size={16} className="text-red-500" /> Reject / Cancel Return</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
            <p className="font-semibold text-red-700 dark:text-red-400">Return #{returnRecord.id?.slice(-6)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {returnRecord.items?.length} item(s) — what happens to the products?
            </p>
          </div>

          {/* What to do with the products */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Product Disposition *</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDisposition("restock")}
                className={cn("p-3 border rounded-xl text-sm font-medium transition-all text-left",
                  disposition === "restock" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700" : "border-border hover:border-primary/40")}>
                <Boxes size={15} className="mb-1" />
                <p>Return to Stock</p>
                <p className="text-[10px] text-muted-foreground font-normal">Add back to inventory</p>
              </button>
              <button onClick={() => setDisposition("damage")}
                className={cn("p-3 border rounded-xl text-sm font-medium transition-all text-left",
                  disposition === "damage" ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700" : "border-border hover:border-primary/40")}>
                <AlertTriangle size={15} className="mb-1" />
                <p>Log as Damaged</p>
                <p className="text-[10px] text-muted-foreground font-normal">Record as stock loss</p>
              </button>
            </div>
          </div>

          {disposition === "damage" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Damage Type</label>
              <select value={damageType} onChange={e => setDamageType(e.target.value)} className="form-input w-full">
                {["PHYSICAL","EXPIRED","DEFECTIVE","SUPPLIER_ISSUE","OTHER"].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason for Rejection *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={3} placeholder="Why is this return being rejected?" className="form-input w-full" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-red-500 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Reject Return
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exchange Modal ─────────────────────────────────────────────────
function ExchangeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [sale, setSale]               = useState<any>(null);
  const [returnItem, setReturnItem]   = useState<any>(null);
  const [returnQty, setReturnQty]     = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [newProduct, setNewProduct]   = useState<any>(null);
  const [newQty, setNewQty]           = useState(1);
  const [searching, setSearching]     = useState(false);
  const [loading, setLoading]         = useState(false);
  // Extra payment from buyer (buyer pays more)
  const [buyerExtraPayment, setBuyerExtraPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const searchProducts = async () => {
    if (!productSearch.trim()) return;
    setSearching(true); setSearchResults([]); setNewProduct(null);
    try {
      const res  = await fetch(`/api/products/search?q=${encodeURIComponent(productSearch.trim())}`);
      const data = await res.json();
      if (data.success) setSearchResults(data.data || []);
      else toast.error("No products found");
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const returnValue  = returnItem ? Number(returnItem.sellingPrice) * returnQty : 0;
  const newValue     = newProduct ? Number(newProduct.costPrice)    * newQty    : 0;
  const rawDiff      = newValue - returnValue;
  // If buyer adds extra payment on top
  const effectiveDiff  = rawDiff - buyerExtraPayment;
  const customerPays   = rawDiff > 0 ? rawDiff : 0;
  const storeRefunds   = rawDiff < 0 ? Math.abs(rawDiff) : 0;

  const handleSubmit = async () => {
    if (!sale || !returnItem || !newProduct) { toast.error("Complete all fields"); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/exchanges", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId:            sale.id,
          originalProductId: returnItem.productId,
          newProductId:      newProduct.id,
          quantityReturned:  returnQty,
          quantityGiven:     newQty,
          priceDifference:   rawDiff,
          extraPayment:      customerPays + buyerExtraPayment,
          refundAmount:      storeRefunds,
          paymentMethod,
          notes:             buyerExtraPayment > 0 ? `Buyer paid extra: ${formatCurrency(buyerExtraPayment)} via ${paymentMethod}` : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Exchange processed!"); onSuccess(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-bold flex items-center gap-2"><ArrowLeftRight size={16} className="text-primary" /> Product Exchange</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Step 1 */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</span>
              Original Sale
            </p>
            <SaleSearch onFound={s => { setSale(s); setReturnItem(null); }} />
            {sale && (
              <div className="space-y-2">
                <div className="bg-muted/50 rounded-xl p-3 text-sm">
                  <p className="font-semibold">{sale.orderCode} · {formatDateTime(sale.createdAt)}</p>
                  <p className="text-primary font-bold">{formatCurrency(sale.totalAmount)}</p>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">Select item being returned:</p>
                {sale.items?.map((item: any) => (
                  <button key={item.productId} onClick={() => { setReturnItem(item); setReturnQty(1); }}
                    className={cn("w-full flex items-center justify-between p-3 border rounded-xl text-left transition-all",
                      returnItem?.productId === item.productId ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.sellingPrice)} × {item.quantity}</p>
                    </div>
                    {returnItem?.productId === item.productId && <CheckCircle2 size={16} className="text-primary" />}
                  </button>
                ))}
                {returnItem && (
                  <div className="flex items-center gap-3 mt-1">
                    <label className="text-xs text-muted-foreground">Return qty:</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReturnQty(q => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold">−</button>
                      <span className="w-6 text-center font-bold">{returnQty}</span>
                      <button onClick={() => setReturnQty(q => Math.min(returnItem.quantity, q + 1))}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold">+</button>
                    </div>
                    <span className="text-xs text-primary font-semibold">= {formatCurrency(returnValue)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 */}
          {returnItem && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">2</span>
                New Product (search by name or SKU)
              </p>
              <div className="flex gap-2">
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchProducts()}
                  placeholder="Type product name or SKU…" className="flex-1 form-input" />
                <button onClick={searchProducts} disabled={searching}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-50">
                  {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                </button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && !newProduct && (
                <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map((p: any) => (
                    <button key={p.id} onClick={() => { setNewProduct(p); setNewQty(1); setSearchResults([]); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku} · {formatCurrency(p.costPrice)}</p>
                      </div>
                      <span className={cn("text-xs font-bold", p.stockQuantity === 0 ? "text-red-500" : "text-emerald-600")}>
                        {p.stockQuantity} in stock
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {newProduct && (
                <div className="p-3 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{newProduct.name}</p>
                      <p className="text-xs text-muted-foreground">{newProduct.sku} · Cost: {formatCurrency(newProduct.costPrice)} · Stock: {newProduct.stockQuantity}</p>
                    </div>
                    <button onClick={() => { setNewProduct(null); setSearchResults([]); }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground"><X size={13} /></button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-xs text-muted-foreground">Give qty:</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setNewQty(q => Math.max(1, q - 1))}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold">−</button>
                      <span className="w-6 text-center font-bold">{newQty}</span>
                      <button onClick={() => setNewQty(q => Math.min(newProduct.stockQuantity, q + 1))}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center font-bold">+</button>
                    </div>
                    <span className="text-xs text-primary font-semibold">= {formatCurrency(newValue)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Balance */}
          {newProduct && returnItem && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">3</span>
                Payment Balance
              </p>

              {/* Summary */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Returned value</span>
                  <span className="font-medium text-emerald-600">+{formatCurrency(returnValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New product value</span>
                  <span className="font-medium text-red-500">−{formatCurrency(newValue)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>{rawDiff > 0 ? "Customer pays" : rawDiff < 0 ? "Store refunds" : "Even exchange"}</span>
                  <span className={rawDiff > 0 ? "text-amber-600" : rawDiff < 0 ? "text-emerald-600" : ""}>
                    {rawDiff !== 0 ? formatCurrency(Math.abs(rawDiff)) : "₦0"}
                  </span>
                </div>
              </div>

              {/* Buyer adds extra payment */}
              <div className="border border-border rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Buyer adds extra payment? (optional)</p>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground shrink-0">₦</span>
                  <input type="number" min="0" value={buyerExtraPayment || ""}
                    onChange={e => setBuyerExtraPayment(parseFloat(e.target.value) || 0)}
                    placeholder="0.00" className="flex-1 form-input text-sm" />
                </div>
                {buyerExtraPayment > 0 && (
                  <>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="form-input w-full text-sm">
                      {["CASH","BANK_TRANSFER","POS_TERMINAL","MOBILE_MONEY"].map(m => (
                        <option key={m} value={m}>{m.replace(/_/g," ")}</option>
                      ))}
                    </select>
                    <p className="text-xs text-primary font-medium">
                      Buyer pays {formatCurrency(customerPays + buyerExtraPayment)} total via {paymentMethod.replace(/_/g," ")}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !newProduct || !returnItem}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />} Process Exchange
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Edit Refund Modal ──────────────────────────────────────────────
function EditRefundModal({ refund, onClose, onSuccess }: { refund: any; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount]   = useState(String(Number(refund.amount)));
  const [reason, setReason]   = useState(refund.reason || "");
  const [method, setMethod]   = useState(refund.refundMethod || "CASH");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !reason.trim()) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/refunds/${refund.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), reason: reason.trim(), refundMethod: method }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Refund updated"); onSuccess(); }
      else toast.error(data.error || "Failed to update");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold flex items-center gap-2"><Edit size={16} className="text-primary" /> Edit Refund Request</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="font-semibold">{refund.sale?.orderCode}</p>
            <p className="text-xs text-muted-foreground">Original sale total: {formatCurrency(refund.sale?.totalAmount || 0)}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Refund Amount (₦) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              max={Number(refund.sale?.totalAmount || 9999999)} className="form-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Refund Method *</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="form-input w-full">
              {["CASH","BANK_TRANSFER","POS_TERMINAL","MOBILE_MONEY"].map(m => (
                <option key={m} value={m}>{m.replace(/_/g," ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={3} placeholder="Reason for refund…" className="form-input w-full" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Edit size={15} />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Exchange Modal ────────────────────────────────────────────
function EditExchangeModal({ exchange, onClose, onSuccess }: { exchange: any; onClose: () => void; onSuccess: () => void }) {
  const [newQty, setNewQty]               = useState(exchange.quantityGiven || 1);
  const [returnQty, setReturnQty]         = useState(exchange.quantityReturned || 1);
  const [extraPayment, setExtraPayment]   = useState(Number(exchange.extraPayment) || 0);
  const [refundAmount, setRefundAmount]   = useState(Number(exchange.refundAmount) || 0);
  const [notes, setNotes]                 = useState(exchange.notes || "");
  const [loading, setLoading]             = useState(false);

  const priceDiff = extraPayment - refundAmount;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/exchanges/${exchange.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityReturned: returnQty,
          quantityGiven:    newQty,
          extraPayment,
          refundAmount,
          priceDifference:  priceDiff,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Exchange updated"); onSuccess(); }
      else toast.error(data.error || "Failed to update");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold flex items-center gap-2"><Edit size={16} className="text-primary" /> Edit Exchange</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
            <p className="font-semibold">{exchange.sale?.orderCode}</p>
            <p className="text-xs text-muted-foreground">
              Returned: <span className="font-medium">{exchange.originalProduct?.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Given: <span className="font-medium">{exchange.newProduct?.name}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Qty Returned</label>
              <input type="number" min="1" value={returnQty}
                onChange={e => setReturnQty(parseInt(e.target.value) || 1)}
                className="form-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Qty Given</label>
              <input type="number" min="1" value={newQty}
                onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                className="form-input w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Buyer Paid Extra (₦)</label>
              <input type="number" min="0" value={extraPayment}
                onChange={e => setExtraPayment(parseFloat(e.target.value) || 0)}
                className="form-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Store Refunded (₦)</label>
              <input type="number" min="0" value={refundAmount}
                onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                className="form-input w-full" />
            </div>
          </div>

          <div className={cn("rounded-xl p-3 text-sm text-center font-semibold",
            priceDiff > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
              : priceDiff < 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20"
              : "bg-muted text-foreground")}>
            {priceDiff === 0 ? "Even exchange" : priceDiff > 0 ? `Buyer paid extra: ${formatCurrency(priceDiff)}` : `Store refunded: ${formatCurrency(Math.abs(priceDiff))}`}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Optional notes…" className="form-input w-full" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Edit size={15} />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Detail View Modal (unified for refund/return/exchange/damage) ──
function DetailViewModal({ viewing, onClose }: { viewing: { type: string; data: any }; onClose: () => void }) {
  const { type, data: d } = viewing;

  const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
    refund:   { label: "Refund Request",  icon: DollarSign,    color: "bg-amber-600" },
    return:   { label: "Return Request",  icon: RotateCcw,     color: "bg-blue-600" },
    exchange: { label: "Product Exchange", icon: ArrowLeftRight, color: "bg-violet-600" },
    damage:   { label: "Damaged Product",  icon: AlertTriangle,  color: "bg-red-600" },
  };
  const meta = TYPE_META[type];
  const Icon = meta.icon;

  const Row = ({ label, value, bold, color }: { label: string; value: any; bold?: boolean; color?: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm text-right", bold && "font-bold", color)}>{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", meta.color)}><Icon size={16} className="text-white" /></div>
            <div>
              <h2 className="font-bold">{meta.label}</h2>
              {d.sale?.orderCode && <p className="text-xs font-mono text-primary font-semibold">{d.sale.orderCode}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-1">

          {/* ── REFUND DETAIL ── */}
          {type === "refund" && (
            <>
              <Row label="Status"        value={<span className={cn("badge text-xs", REFUND_BADGE[d.status])}>{d.status}</span>} />
              <Row label="Amount"        value={formatCurrency(d.amount)} bold color="text-red-600" />
              <Row label="Method"        value={d.refundMethod?.replace(/_/g," ") || "—"} />
              <Row label="Shop"          value={d.sale?.shop?.name} />
              <Row label="Requested By"  value={d.requestedBy?.name} />
              {d.approvedBy?.name && <Row label="Approved By" value={d.approvedBy.name} />}
              <Row label="Requested On"  value={formatDateTime(d.createdAt)} />
              {d.approvedAt   && <Row label="Approved On"   value={formatDateTime(d.approvedAt)} />}
              {d.completedAt  && <Row label="Completed On"  value={formatDateTime(d.completedAt)} />}
              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Reason</p>
                <p className="text-sm bg-muted/50 rounded-xl p-3">{d.reason}</p>
              </div>
              {d.notes && (
                <div className="pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-xl p-3">{d.notes}</p>
                </div>
              )}
            </>
          )}

          {/* ── RETURN DETAIL ── */}
          {type === "return" && (
            <>
              <Row label="Status"       value={<span className={cn("badge text-xs", RETURN_BADGE[d.status] || "badge-neutral")}>{d.status}</span>} />
              <Row label="Shop"         value={d.sale?.shop?.name || "—"} />
              <Row label="Original Sale Staff" value={d.sale?.staff?.name || "—"} />
              <Row label="Created On"   value={formatDateTime(d.createdAt)} />
              {d.restocked !== undefined && <Row label="Restocked" value={d.restocked ? "Yes ✓" : "No"} />}

              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Items Returned</p>
                <div className="space-y-2">
                  {d.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                      <div>
                        <p className="text-sm font-medium">{item.product?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.product?.sku}</p>
                      </div>
                      <span className="text-sm font-bold">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Reason</p>
                <p className="text-sm bg-muted/50 rounded-xl p-3">{d.reason}</p>
              </div>
              {d.notes && (
                <div className="pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-xl p-3">{d.notes}</p>
                </div>
              )}
            </>
          )}

          {/* ── EXCHANGE DETAIL ── */}
          {type === "exchange" && (
            <>
              <Row label="Shop"      value={d.sale?.shop?.name} />
              <Row label="Date"      value={formatDateTime(d.createdAt)} />

              <div className="pt-3 grid grid-cols-2 gap-3">
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-red-600 uppercase mb-1">Returned</p>
                  <p className="text-sm font-medium">{d.originalProduct?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{d.originalProduct?.sku}</p>
                  <p className="text-sm font-bold mt-1">×{d.quantityReturned}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-emerald-600 uppercase mb-1">Given</p>
                  <p className="text-sm font-medium">{d.newProduct?.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{d.newProduct?.sku}</p>
                  <p className="text-sm font-bold mt-1">×{d.quantityGiven}</p>
                </div>
              </div>

              <div className="pt-3 space-y-0">
                <Row label="Price Difference" value={`${Number(d.priceDifference) >= 0 ? "+" : ""}${formatCurrency(d.priceDifference)}`}
                  bold color={Number(d.priceDifference) >= 0 ? "text-amber-600" : "text-emerald-600"} />
                <Row label="Buyer Paid Extra" value={Number(d.extraPayment) > 0 ? formatCurrency(d.extraPayment) : "—"} />
                <Row label="Store Refunded"   value={Number(d.refundAmount) > 0 ? formatCurrency(d.refundAmount) : "—"} />
              </div>

              {d.notes && (
                <div className="pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-xl p-3">{d.notes}</p>
                </div>
              )}
            </>
          )}

          {/* ── DAMAGE DETAIL ── */}
          {type === "damage" && (
            <>
              <Row label="Product"     value={d.product?.name} bold />
              <Row label="SKU"         value={d.product?.sku} />
              <Row label="Shop"        value={d.shop?.name} />
              <Row label="Damage Type" value={d.damageType?.replace(/_/g," ")} />
              <Row label="Quantity"    value={`×${d.quantity}`} bold color="text-red-600" />
              <Row label="Cost Loss"   value={formatCurrency(d.costLoss)} bold color="text-red-600" />
              <Row label="Reported By" value={d.reportedBy?.name} />
              <Row label="Date"        value={formatDateTime(d.createdAt)} />
              {d.supplierId && <Row label="Supplier ID" value={d.supplierId} />}

              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Reason</p>
                <p className="text-sm bg-muted/50 rounded-xl p-3">{d.reason}</p>
              </div>
              {d.notes && (
                <div className="pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-xl p-3">{d.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function RefundsReturnsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const qc   = useQueryClient();

  const [tab, setTab]                     = useState<Tab>("refunds");
  const [showRefundModal, setShowRefundModal]     = useState(false);
  const [showReturnModal, setShowReturnModal]     = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [editingReturn, setEditingReturn]         = useState<any>(null);
  const [rejectingReturn, setRejectingReturn]     = useState<any>(null);
  const [rejectingRefund, setRejectingRefund]     = useState<any>(null);
  const [refundRejectReason, setRefundRejectReason] = useState("");
  const [editingRefund, setEditingRefund]         = useState<any>(null);
  const [editingExchange, setEditingExchange]     = useState<any>(null);
  const [deletingId, setDeletingId]               = useState<string | null>(null);
  const [viewing, setViewing]                     = useState<{ type: string; data: any } | null>(null);
  const [refundFilter, setRefundFilter]   = useState("");
  const [returnFilter, setReturnFilter]   = useState("");
  const [damageFilter, setDamageFilter]   = useState("");
  const [page, setPage]                   = useState(1);

  const canApprove = ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user?.role);

  // Queries
  const { data: refundsData,   isLoading: refundsLoading,   refetch: refetchRefunds }   = useQuery({
    queryKey: ["refunds",   refundFilter, page],
    queryFn:  () => fetch(`/api/refunds?${refundFilter ? `status=${refundFilter}&` : ""}page=${page}&limit=20`).then(r => r.json()),
    enabled:  tab === "refunds",
  });
  const { data: returnsData,   isLoading: returnsLoading,   refetch: refetchReturns }   = useQuery({
    queryKey: ["returns",   returnFilter, page],
    queryFn:  () => fetch(`/api/returns?${returnFilter ? `status=${returnFilter}&` : ""}page=${page}&limit=20`).then(r => r.json()),
    enabled:  tab === "returns",
  });
  const { data: exchangesData, isLoading: exchangesLoading }                            = useQuery({
    queryKey: ["exchanges", page],
    queryFn:  () => fetch(`/api/exchanges?page=${page}&limit=20`).then(r => r.json()),
    enabled:  tab === "exchanges",
  });
  const { data: damagedData,   isLoading: damagedLoading,   refetch: refetchDamaged }   = useQuery({
    queryKey: ["damaged",   damageFilter, page],
    queryFn:  () => fetch(`/api/damaged?${damageFilter ? `type=${damageFilter}&` : ""}page=${page}&limit=20`).then(r => r.json()),
    enabled:  tab === "damaged",
  });

  const refunds   = refundsData?.data   || [];
  const returns   = returnsData?.data   || [];
  const exchanges = exchangesData?.data || [];
  const damaged   = damagedData?.data   || [];

  const pendingRefunds  = refunds.filter((r: any) => r.status === "PENDING").length;
  const approvedRefunds = refunds.filter((r: any) => r.status === "APPROVED").length;
  const pendingReturns  = returnsData?.stats?.pending  ?? 0;
  const approvedReturns = returnsData?.stats?.restocked ?? 0;
  const rejectedReturns = returnsData?.stats?.rejected ?? 0;

  // Actions
  const approveRefund   = async (id: string) => {
    await fetch("/api/refunds", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundId: id, action: "approve" }) });
    toast.success("Refund approved"); qc.invalidateQueries({ queryKey: ["refunds"] });
  };
  const rejectRefund = async (id: string, reason: string) => {
    await fetch("/api/refunds", { method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refundId: id, action: "reject", notes: reason }) });
    toast.success("Refund rejected");
    qc.invalidateQueries({ queryKey: ["refunds"] });
  };
  const completeRefund  = async (id: string) => {
    await fetch(`/api/refunds/${id}/complete`, { method: "POST" });
    toast.success("Refund paid out"); qc.invalidateQueries({ queryKey: ["refunds"] });
  };
  const approveReturn   = async (id: string) => {
    const res  = await fetch(`/api/returns/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (data.success) { toast.success("Return approved & restocked"); qc.invalidateQueries({ queryKey: ["returns"] }); }
    else toast.error(data.error || "Failed");
  };

  const handleDeleteRefund = async (id: string) => {
    if (!confirm("Delete this refund request? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/refunds/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Refund deleted"); qc.invalidateQueries({ queryKey: ["refunds"] }); }
      else toast.error(data.error || "Failed to delete");
    } catch { toast.error("Something went wrong"); }
    finally { setDeletingId(null); }
  };

  const handleDeleteReturn = async (id: string) => {
    if (!confirm("Delete this return? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/returns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Return deleted"); invalidateReturns(); }
      else toast.error(data.error || "Failed to delete");
    } catch { toast.error("Something went wrong"); }
    finally { setDeletingId(null); }
  };

  const handleDeleteExchange = async (id: string) => {
    if (!confirm("Delete this exchange record? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/exchanges/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Exchange deleted"); qc.invalidateQueries({ queryKey: ["exchanges"] }); }
      else toast.error(data.error || "Failed to delete");
    } catch { toast.error("Something went wrong"); }
    finally { setDeletingId(null); }
  };

  const invalidateReturns = () => {
    qc.invalidateQueries({ queryKey: ["returns"] });
    qc.invalidateQueries({ queryKey: ["damaged"] });
  };

  const TABS = [
    { id: "refunds",   label: "Refunds",   icon: DollarSign,    badge: pendingRefunds },
    { id: "returns",   label: "Returns",   icon: RotateCcw,     badge: pendingReturns },
    { id: "exchanges", label: "Exchanges", icon: ArrowLeftRight, badge: 0 },
    { id: "damaged",   label: "Damaged",   icon: AlertTriangle,  badge: 0 },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns & Refunds</h1>
          <p className="page-subtitle">Manage refunds, returns, exchanges, and damaged products</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowReturnModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            <RotateCcw size={15} /> New Return
          </button>
          <button onClick={() => setShowExchangeModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            <ArrowLeftRight size={15} /> Exchange
          </button>
          <button onClick={() => setShowRefundModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus size={15} /> Refund Request
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div onClick={() => { setTab("refunds"); setRefundFilter("PENDING"); setPage(1); }}
          className={cn("stat-card cursor-pointer hover:border-amber-400 transition-all",
            tab === "refunds" && refundFilter === "PENDING" ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/10" : "")}>
          <div className="p-2 bg-amber-500 rounded-xl w-fit"><Clock size={18} className="text-white" /></div>
          <p className="text-2xl font-bold mt-3">{pendingRefunds}</p>
          <p className="text-sm text-muted-foreground">Pending Refunds</p>
        </div>
        <div onClick={() => { setTab("refunds"); setRefundFilter("APPROVED"); setPage(1); }}
          className={cn("stat-card cursor-pointer hover:border-emerald-400 transition-all",
            tab === "refunds" && refundFilter === "APPROVED" ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10" : "")}>
          <div className="p-2 bg-emerald-500 rounded-xl w-fit"><CheckCircle2 size={18} className="text-white" /></div>
          <p className="text-2xl font-bold mt-3">{approvedRefunds}</p>
          <p className="text-sm text-muted-foreground">Approved Refunds</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Awaiting pay out</p>
        </div>
        <div onClick={() => { setTab("returns"); setReturnFilter("PENDING"); setPage(1); }}
          className={cn("stat-card cursor-pointer hover:border-blue-400 transition-all",
            tab === "returns" && returnFilter === "PENDING" ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/10" : "")}>
          <div className="p-2 bg-blue-500 rounded-xl w-fit"><RotateCcw size={18} className="text-white" /></div>
          <p className="text-2xl font-bold mt-3">{pendingReturns}</p>
          <p className="text-sm text-muted-foreground">Pending Returns</p>
        </div>
        <div onClick={() => { setTab("returns"); setReturnFilter("RESTOCKED"); setPage(1); }}
          className={cn("stat-card cursor-pointer hover:border-teal-400 transition-all",
            tab === "returns" && returnFilter === "RESTOCKED" ? "border-teal-400 bg-teal-50/50 dark:bg-teal-950/10" : "")}>
          <div className="p-2 bg-teal-500 rounded-xl w-fit"><Boxes size={18} className="text-white" /></div>
          <p className="text-2xl font-bold mt-3">{approvedReturns}</p>
          <p className="text-sm text-muted-foreground">Approved Returns</p>
          <p className="text-[10px] text-teal-600 mt-0.5">Restocked</p>
        </div>
        <div onClick={() => { setTab("returns"); setReturnFilter("REJECTED"); setPage(1); }}
          className={cn("stat-card cursor-pointer hover:border-red-400 transition-all",
            tab === "returns" && returnFilter === "REJECTED" ? "border-red-400 bg-red-50/50 dark:bg-red-950/10" : "")}>
          <div className="p-2 bg-red-500 rounded-xl w-fit"><ShieldX size={18} className="text-white" /></div>
          <p className="text-2xl font-bold mt-3">{rejectedReturns}</p>
          <p className="text-sm text-muted-foreground">Rejected / Cancelled</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => { setTab(id as Tab); setPage(1); }}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Icon size={15} /> {label}
            {badge > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{badge}</span>}
          </button>
        ))}
      </div>

      {/* ══ REFUNDS ══ */}
      {tab === "refunds" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select value={refundFilter} onChange={e => { setRefundFilter(e.target.value); setPage(1); }} className="form-input text-sm">
              <option value="">All Status</option>
              {["PENDING","APPROVED","COMPLETED","REJECTED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => refetchRefunds()} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {refundsLoading ? <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-lg"/>)}</div>
              : refunds.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><DollarSign size={40} className="mb-2 opacity-20"/><p>No refunds found</p></div>
              : (
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Shop</th><th>Amount</th><th>Method</th><th>Reason</th><th>By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {refunds.map((r: any) => (
                      <tr key={r.id} onClick={() => setViewing({ type: "refund", data: r })} className="cursor-pointer">
                        <td><span className="font-mono text-xs font-bold text-primary">{r.sale?.orderCode}</span></td>
                        <td className="text-sm">{r.sale?.shop?.name || "—"}</td>
                        <td className="font-semibold text-sm text-red-600">{formatCurrency(r.amount)}</td>
                        <td className="text-xs">{r.refundMethod?.replace(/_/g," ") || "—"}</td>
                        <td className="text-sm max-w-[120px]"><p className="truncate">{r.reason}</p></td>
                        <td className="text-sm">{r.requestedBy?.name}</td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                        <td><span className={cn("badge text-xs", REFUND_BADGE[r.status])}>{r.status}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {r.status === "PENDING" && (
                              <button onClick={() => setEditingRefund(r)} title="Edit"
                                className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors">
                                <Edit size={14} />
                              </button>
                            )}
                            {r.status === "PENDING" && canApprove && (
                              <>
                                <button onClick={() => approveRefund(r.id)} title="Approve"
                                  className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-600 text-muted-foreground transition-colors">
                                  <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => { setRejectingRefund(r); setRefundRejectReason(""); }} title="Reject"
                                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {r.status === "APPROVED" && (
                              <button onClick={() => completeRefund(r.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors">
                                <DollarSign size={12} /> Pay Out
                              </button>
                            )}
                            {["PENDING","REJECTED"].includes(r.status) && canApprove && (
                              <button onClick={() => handleDeleteRefund(r.id)}
                                disabled={deletingId === r.id} title="Delete"
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40">
                                {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ RETURNS ══ */}
      {tab === "returns" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select value={returnFilter} onChange={e => { setReturnFilter(e.target.value); setPage(1); }} className="form-input text-sm">
              <option value="">All Status</option>
              {["PENDING","APPROVED","REJECTED","RESTOCKED","CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => refetchReturns()} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {returnsLoading ? <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-lg"/>)}</div>
              : returns.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><RotateCcw size={40} className="mb-2 opacity-20"/><p>No returns found</p></div>
              : (
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Items</th><th>Reason</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {returns.map((r: any) => (
                      <tr key={r.id} onClick={() => setViewing({ type: "return", data: r })} className="cursor-pointer">
                        <td><span className="font-mono text-xs font-bold text-primary">{r.sale?.orderCode}</span></td>
                        <td>
                          <div className="space-y-0.5">
                            {r.items?.map((i: any) => (
                              <p key={i.id} className="text-xs">{i.product?.name || "—"} ×{i.quantity}</p>
                            ))}
                          </div>
                        </td>
                        <td className="text-sm max-w-[130px]"><p className="truncate">{r.reason}</p></td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                        <td>
                          <span className={cn("badge text-xs", RETURN_BADGE[r.status] || "badge-neutral")}>{r.status}</span>
                          {["REJECTED","CANCELLED"].includes(r.status) && r.disposition && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              → {r.disposition === "damage" ? "Logged as damage" : "Restocked"}
                            </p>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {/* Edit — only PENDING returns */}
                            {r.status === "PENDING" && (
                              <button onClick={() => setEditingReturn(r)} title="Edit"
                                className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors">
                                <Edit size={14} />
                              </button>
                            )}
                            {/* Approve — pending only */}
                            {r.status === "PENDING" && canApprove && (
                              <button onClick={() => approveReturn(r.id)} title="Approve & Restock"
                                className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-600 text-muted-foreground transition-colors">
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                            {/* Reject / Cancel */}
                            {r.status === "PENDING" && canApprove && (
                              <button onClick={() => setRejectingReturn(r)} title="Reject / Cancel"
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors">
                                <XCircle size={14} />
                              </button>
                            )}
                            {/* Delete */}
                            {["PENDING","REJECTED"].includes(r.status) && canApprove && (
                              <button onClick={() => handleDeleteReturn(r.id)}
                                disabled={deletingId === r.id} title="Delete"
                                className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40">
                                {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ EXCHANGES ══ */}
      {tab === "exchanges" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {exchangesLoading ? <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-lg"/>)}</div>
            : exchanges.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><ArrowLeftRight size={40} className="mb-2 opacity-20"/><p>No exchanges recorded</p></div>
            : (
              <table className="data-table">
                <thead><tr><th>Order</th><th>Returned</th><th>Given</th><th>Price Diff</th><th>Buyer Paid</th><th>Store Refunded</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>
                  {exchanges.map((ex: any) => (
                    <tr key={ex.id} onClick={() => setViewing({ type: "exchange", data: ex })} className="cursor-pointer">
                      <td><span className="font-mono text-xs font-bold text-primary">{ex.sale?.orderCode}</span></td>
                      <td className="text-sm">{ex.originalProduct?.name} ×{ex.quantityReturned}</td>
                      <td className="text-sm">{ex.newProduct?.name} ×{ex.quantityGiven}</td>
                      <td className={cn("text-sm font-semibold", Number(ex.priceDifference) >= 0 ? "text-amber-600" : "text-emerald-600")}>
                        {Number(ex.priceDifference) >= 0 ? "+" : ""}{formatCurrency(ex.priceDifference)}
                      </td>
                      <td className="text-sm">{Number(ex.extraPayment) > 0 ? formatCurrency(ex.extraPayment) : "—"}</td>
                      <td className="text-sm">{Number(ex.refundAmount) > 0 ? formatCurrency(ex.refundAmount) : "—"}</td>
                      <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(ex.createdAt)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingExchange(ex)} title="Edit"
                            className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors">
                            <Edit size={14} />
                          </button>
                          {canApprove && (
                            <button onClick={() => handleDeleteExchange(ex.id)}
                              disabled={deletingId === ex.id} title="Delete"
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40">
                              {deletingId === ex.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ DAMAGED ══ */}
      {tab === "damaged" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <select value={damageFilter} onChange={e => { setDamageFilter(e.target.value); setPage(1); }} className="form-input text-sm">
              <option value="">All Types</option>
              {["PHYSICAL","EXPIRED","DEFECTIVE","SUPPLIER_ISSUE","OTHER"].map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
            </select>
            <button onClick={() => refetchDamaged()} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
              <RefreshCw size={15} className="text-muted-foreground" />
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {damagedLoading ? <div className="p-8 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 skeleton rounded-lg"/>)}</div>
              : damaged.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><AlertTriangle size={40} className="mb-2 opacity-20"/><p>No damaged products recorded</p></div>
              : (
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Type</th><th>Source</th><th>Qty</th><th>Cost Loss</th><th>Reason</th><th>Reported By</th><th>Date</th></tr></thead>
                  <tbody>
                    {damaged.map((d: any) => (
                      <tr key={d.id} onClick={() => setViewing({ type: "damage", data: d })} className="cursor-pointer">
                        <td>
                          <div>
                            <p className="font-medium text-sm">{d.product?.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{d.product?.sku}</p>
                          </div>
                        </td>
                        <td>
                          <span className={cn("badge text-xs",
                            d.damageType === "EXPIRED" ? "badge-warning" : d.damageType === "DEFECTIVE" ? "badge-danger" : "badge-neutral")}>
                            {d.damageType?.replace(/_/g," ")}
                          </span>
                        </td>
                        <td>
                          {d.returnId
                            ? <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">Rejected Return</span>
                            : <span className="text-xs px-2 py-0.5 bg-muted rounded-full">Manual</span>}
                        </td>
                        <td className="font-bold text-sm text-red-600">×{d.quantity}</td>
                        <td className="font-semibold text-sm text-red-600">{formatCurrency(d.costLoss)}</td>
                        <td className="text-sm max-w-[130px]"><p className="truncate">{d.reason}</p></td>
                        <td className="text-sm">{d.reportedBy?.name}</td>
                        <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRefundModal   && <RequestRefundModal onClose={() => setShowRefundModal(false)}   onSuccess={() => { setShowRefundModal(false);   qc.invalidateQueries({ queryKey: ["refunds"] }); }} />}
      {showReturnModal   && <ReturnModal         onClose={() => setShowReturnModal(false)}   onSuccess={() => { setShowReturnModal(false);   invalidateReturns(); }} />}
      {showExchangeModal && <ExchangeModal       onClose={() => setShowExchangeModal(false)} onSuccess={() => { setShowExchangeModal(false); qc.invalidateQueries({ queryKey: ["exchanges"] }); }} />}
      {editingReturn     && <ReturnModal existing={editingReturn} onClose={() => setEditingReturn(null)} onSuccess={() => { setEditingReturn(null); invalidateReturns(); }} />}
      {editingRefund     && (
        <EditRefundModal
          refund={editingRefund}
          onClose={() => setEditingRefund(null)}
          onSuccess={() => { setEditingRefund(null); qc.invalidateQueries({ queryKey: ["refunds"] }); }}
        />
      )}
      {editingExchange   && (
        <EditExchangeModal
          exchange={editingExchange}
          onClose={() => setEditingExchange(null)}
          onSuccess={() => { setEditingExchange(null); qc.invalidateQueries({ queryKey: ["exchanges"] }); }}
        />
      )}
      {rejectingRefund   && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-bold flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Reject Refund</h2>
              <button onClick={() => setRejectingRefund(null)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
                <p className="font-semibold text-red-700 dark:text-red-400">Refund for {rejectingRefund.sale?.orderCode}</p>
                <p className="text-xs text-muted-foreground mt-1">Amount: {formatCurrency(rejectingRefund.amount)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason for Rejection *</label>
                <textarea value={refundRejectReason} onChange={e => setRefundRejectReason(e.target.value)}
                  rows={4} placeholder="Why is this refund being rejected?"
                  className="form-input w-full" autoFocus />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setRejectingRefund(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={async () => {
                  if (!refundRejectReason.trim()) { toast.error("Enter a reason"); return; }
                  await rejectRefund(rejectingRefund.id, refundRejectReason.trim());
                  setRejectingRefund(null);
                  setRefundRejectReason("");
                }}
                disabled={!refundRejectReason.trim()}
                className="flex-[2] py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-red-500 transition-colors">
                <XCircle size={15} /> Reject Refund
              </button>
            </div>
          </div>
        </div>
      )}
      {rejectingReturn   && <RejectReturnModal returnRecord={rejectingReturn} onClose={() => setRejectingReturn(null)} onSuccess={() => { setRejectingReturn(null); invalidateReturns(); }} />}
      {viewing           && <DetailViewModal viewing={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
