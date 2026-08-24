"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Wrench, Plus, Search, ChevronRight, Loader2,
  X, Package, ShoppingBag, AlertCircle, Clock, User, Lock, Pencil, Store
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING:       "badge-warning",
  IN_PROGRESS:   "badge-info",
  WAITING_PARTS: "badge-purple",
  READY:         "badge-success",
  COMPLETED:     "badge-neutral",
  CANCELLED:     "badge-danger",
};

// Statuses where the repair can still be edited
const EDITABLE_STATUSES = new Set(["PENDING", "IN_PROGRESS", "WAITING_PARTS", "READY"]);

// ─── Types ─────────────────────────────────────────────────────────────────────

type PartLine =
  | { source: "product"; productId: string; name: string; quantity: number; unitCost: number; chargePrice: string; stock: number }
  | { source: "manual";  productId: null;   name: string; quantity: number; unitCost: string; chargePrice: string; shopName: string; shopOwner: string };

// ─── Product Search Combobox ───────────────────────────────────────────────────

function ProductSearchCombobox({ onSelect, disabled }: { onSelect: (p: any) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["product-search", query],
    queryFn: async () => {
      if (!query.trim()) return { data: [] };
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=8`);
      return res.json();
    },
    enabled: query.length > 0,
  });

  const products: any[] = data?.data || [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="form-input w-full pl-8 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={disabled ? "Editing locked" : "Search shop products…"}
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {!disabled && open && query.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {products.length === 0 && !isFetching ? (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No products found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto divide-y divide-border">
              {products.map((p: any) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(p); setQuery(""); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                  >
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Cost: {formatCurrency(p.costPrice ?? 0)}</p>
                      <p className="text-sm font-semibold">Sell: {formatCurrency(p.sellingPrice ?? p.costPrice ?? 0)}</p>
                      <p className={cn("text-xs", (p.stock ?? 0) > 0 ? "text-green-600" : "text-destructive")}>
                        {p.stock ?? 0} in stock
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Parts Section ─────────────────────────────────────────────────────────────

function PartsSection({
  parts, onChange, readonly,
}: {
  parts: PartLine[];
  onChange: (p: PartLine[]) => void;
  readonly?: boolean;
}) {
  const addManual = () =>
    onChange([
      ...parts,
      {
        source: "manual",
        productId: null,
        name: "",
        quantity: 1,
        unitCost: "",
        chargePrice: "",
        shopName: "",
        shopOwner: "",
      },
    ]);

  const addFromProduct = (p: any) =>
    onChange([
      ...parts,
      {
        source: "product",
        productId: p.id,
        name: p.name,
        quantity: 1,
        unitCost: Number(p.costPrice ?? 0),
        chargePrice: String(p.sellingPrice ?? p.costPrice ?? ""),
        stock: p.stock ?? 0,
      },
    ]);

  const remove = (i: number) => onChange(parts.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, value: any) =>
    onChange(parts.map((part, idx) => (idx === i ? { ...part, [field]: value } : part)));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parts Used</h3>
        {!readonly && (
          <button
            type="button"
            onClick={addManual}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-2 py-1 transition-colors"
          >
            <Plus className="h-3 w-3" /> Outside part
          </button>
        )}
      </div>

      <ProductSearchCombobox onSelect={addFromProduct} disabled={readonly} />

      {parts.length === 0 ? (
        <div className="mt-3 border-2 border-dashed border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
          {readonly ? "No parts recorded" : "Search shop inventory above or add an outside part"}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[1fr_56px_100px_100px_28px] gap-2 px-1">
            <span className="text-xs text-muted-foreground">Part</span>
            <span className="text-xs text-muted-foreground text-center">Qty</span>
            <span className="text-xs text-muted-foreground">Cost (₦)</span>
            <span className="text-xs text-muted-foreground">Charge (₦)</span>
            <span />
          </div>

          {parts.map((part, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[1fr_56px_100px_100px_28px] gap-2 items-start rounded-xl p-2 border",
                part.source === "product"
                  ? "bg-primary/5 border-primary/20"
                  : "bg-amber-50/50 border-dashed border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
              )}
            >
              {/* Name + shop fields for manual parts */}
              <div className="flex items-start gap-1.5 min-w-0">
                {part.source === "product"
                  ? <Package className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  : <ShoppingBag className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                }

                {part.source === "product" ? (
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{part.name}</p>
                    <p className={cn("text-xs", part.stock > 0 ? "text-green-600" : "text-destructive")}>
                      {part.stock} in stock
                    </p>
                  </div>
                ) : readonly ? (
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{part.name}</p>
                    {(part.shopName || part.shopOwner) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[part.shopName, part.shopOwner].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <input
                      value={part.name}
                      onChange={e => update(i, "name", e.target.value)}
                      className="form-input text-sm py-1 h-auto w-full"
                      placeholder="Part name *"
                    />
                    <input
                      value={(part as any).shopName}
                      onChange={e => update(i, "shopName", e.target.value)}
                      className="form-input text-xs py-1 h-auto w-full"
                      placeholder="Shop name"
                    />
                    <input
                      value={(part as any).shopOwner}
                      onChange={e => update(i, "shopOwner", e.target.value)}
                      className="form-input text-xs py-1 h-auto w-full"
                      placeholder="Shop owner"
                    />
                  </div>
                )}
              </div>

              {/* Qty */}
              {readonly ? (
                <div className="text-center text-sm font-medium pt-1">{part.quantity}</div>
              ) : (
                <input
                  type="number" min="1" value={part.quantity}
                  onChange={e => update(i, "quantity", Math.max(1, Number(e.target.value)))}
                  className="form-input text-center text-sm py-1 h-auto"
                />
              )}

              {/* Cost Price */}
              {part.source === "product" || readonly ? (
                <div className="form-input text-sm py-1 h-auto bg-muted/60 text-muted-foreground cursor-default select-none truncate">
                  {part.source === "product"
                    ? formatCurrency(part.unitCost)
                    : formatCurrency(Number((part as any).unitCost) || 0)}
                </div>
              ) : (
                <input
                  type="number" value={(part as any).unitCost}
                  onChange={e => update(i, "unitCost", e.target.value)}
                  className="form-input text-sm py-1 h-auto" placeholder="0.00"
                />
              )}

              {/* Charge Price */}
              {readonly ? (
                <div className="form-input text-sm py-1 h-auto bg-muted/60 text-muted-foreground cursor-default select-none truncate">
                  {formatCurrency(Number(part.chargePrice) || 0)}
                </div>
              ) : (
                <input
                  type="number" value={part.chargePrice}
                  onChange={e => update(i, "chargePrice", e.target.value)}
                  className="form-input text-sm py-1 h-auto" placeholder="0.00"
                />
              )}

              {/* Remove */}
              {readonly ? (
                <span />
              ) : (
                <button
                  type="button" onClick={() => remove(i)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared form fields (used by both New + Edit modals) ──────────────────────

function RepairFormFields({
  form, setForm, parts, setParts, readonly,
}: {
  form: any;
  setForm: (fn: (f: any) => any) => void;
  parts: PartLine[];
  setParts: (p: PartLine[]) => void;
  readonly?: boolean;
}) {
  const totalParts = parts.reduce((s, p) => s + (Number(p.chargePrice) || 0) * p.quantity, 0);
  const total      = totalParts + (Number(form.laborCost) || 0);

  const field = (label: string, key: string, placeholder: string, type = "text") => (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        disabled={readonly}
        onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
        className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <>
      {/* Customer */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer Info</h3>
        <div className="grid grid-cols-2 gap-3">
          {field("Customer Name *", "customerName", "Full name")}
          {field("Phone", "customerPhone", "+234...")}
        </div>
      </div>

      {/* Engineer */}
      <div>
        <label className="block text-xs font-medium mb-1.5">Engineer Name *</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={form.engineerName}
            disabled={readonly}
            onChange={e => setForm((f: any) => ({ ...f, engineerName: e.target.value }))}
            className="form-input w-full pl-9 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Technician / engineer name"
          />
        </div>
      </div>

      {/* Device */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Device Info</h3>
        <div className="grid grid-cols-2 gap-3">
          {field("Device Type *", "deviceType", "e.g. iPhone 14 Pro, Samsung S23")}
          {field("Model / Color", "deviceModel", "Gold, 256GB, etc.")}
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium mb-1.5">Issue Description *</label>
          <textarea
            value={form.issueDesc}
            disabled={readonly}
            onChange={e => setForm((f: any) => ({ ...f, issueDesc: e.target.value }))}
            className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
            rows={2} placeholder="Describe the problem..."
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium mb-1.5">Repair Notes</label>
          <textarea
            value={form.repairNotes}
            disabled={readonly}
            onChange={e => setForm((f: any) => ({ ...f, repairNotes: e.target.value }))}
            className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
            rows={2} placeholder="Internal notes..."
          />
        </div>
      </div>

      {/* Parts */}
      <PartsSection parts={parts} onChange={setParts} readonly={readonly} />

      {/* Pricing */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pricing</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5">Labour Cost (₦)</label>
            <input
              type="number" value={form.laborCost}
              disabled={readonly}
              onChange={e => setForm((f: any) => ({ ...f, laborCost: e.target.value }))}
              className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Payment Method</label>
            <select
              value={form.paymentMethod}
              disabled={readonly}
              onChange={e => setForm((f: any) => ({ ...f, paymentMethod: e.target.value }))}
              className="form-input w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="POS_TERMINAL">POS Terminal</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>
        <div className="mt-3 bg-muted/50 rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Parts (charge total)</span><span>{formatCurrency(totalParts)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Labour</span><span>{formatCurrency(Number(form.laborCost) || 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Helper: serialize parts for API ──────────────────────────────────────────

function serializeParts(parts: PartLine[]) {
  return parts.map(p => ({
    name:        p.name,
    quantity:    p.quantity,
    unitCost:    p.source === "product" ? p.unitCost : Number((p as any).unitCost) || 0,
    chargePrice: Number(p.chargePrice) || 0,
    productId:   p.productId ?? null,
    shopName:    p.source === "manual" ? (p as any).shopName || null : null,
    shopOwner:   p.source === "manual" ? (p as any).shopOwner || null : null,
  }));
}

// ─── New Repair Modal ──────────────────────────────────────────────────────────

function NewRepairModal({ onClose, onSuccess }: any) {
  const [createdAt] = useState(() => new Date());
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", engineerName: "",
    deviceType: "", deviceModel: "", issueDesc: "", repairNotes: "",
    laborCost: "", paymentMethod: "CASH",
  });
  const [parts, setParts] = useState<PartLine[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.customerName || !form.deviceType || !form.issueDesc || !form.engineerName) {
      toast.error("Fill in customer name, engineer name, device type, and issue description");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          laborCost: Number(form.laborCost) || 0,
          parts: serializeParts(parts),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Repair job ${data.data.orderCode} created!`);
        onSuccess();
      } else {
        toast.error(data.error || "Failed to create repair job");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> New Repair Job
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Timestamp banner */}
          <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-4 py-2.5 border border-border text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium uppercase tracking-wider mr-1">Created</span>
            <span className="font-semibold text-foreground tabular-nums">
              {createdAt.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}
              {createdAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
          </div>

          <RepairFormFields form={form} setForm={setForm} parts={parts} setParts={setParts} />
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Create Repair Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / Edit Modal ───────────────────────────────────────────────────────

function RepairDetailModal({ repair: initial, onClose, canEdit, isSuperAdmin }: any) {
  const isEditable  = canEdit && EDITABLE_STATUSES.has(initial.status);
  const isCompleted = initial.status === "COMPLETED";

  const [status, setStatus]   = useState(initial.status);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [form, setForm] = useState({
    customerName:  initial.customerName  || "",
    customerPhone: initial.customerPhone || "",
    engineerName:  initial.engineerName  || initial.staff?.name || "",
    deviceType:    initial.deviceType    || "",
    deviceModel:   initial.deviceModel   || "",
    issueDesc:     initial.issueDesc     || "",
    repairNotes:   initial.repairNotes   || "",
    laborCost:     String(initial.laborCost ?? ""),
    paymentMethod: initial.paymentMethod || "CASH",
  });

  // Convert saved parts into PartLine[]
  const [parts, setParts] = useState<PartLine[]>(
    (initial.partsUsed || []).map((p: any): PartLine =>
      p.productId
        ? {
            source: "product",
            productId: p.productId,
            name: p.name,
            quantity: p.quantity,
            unitCost: Number(p.unitCost),
            chargePrice: String(p.chargePrice ?? p.unitCost),
            stock: 0,
          }
        : {
            source: "manual",
            productId: null,
            name: p.name,
            quantity: p.quantity,
            unitCost: String(p.unitCost),
            chargePrice: String(p.chargePrice ?? p.unitCost),
            shopName: p.shopName || "",
            shopOwner: p.shopOwner || "",
          }
    )
  );

  const handleSave = async () => {
    if (!form.customerName || !form.deviceType || !form.issueDesc || !form.engineerName) {
      toast.error("Fill in customer name, engineer name, device type, and issue description");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/repairs/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          laborCost: Number(form.laborCost) || 0,
          parts: serializeParts(parts),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Repair job updated");
        setEditing(false);
        onClose();
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/repairs/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) { setStatus(newStatus); toast.success("Status updated"); }
      else toast.error("Failed to update status");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_PARTS", "READY", "COMPLETED", "CANCELLED"];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-xl text-primary tracking-widest">{initial.orderCode}</span>
              <span className={cn("badge text-xs", STATUS_COLORS[status] || "badge-neutral")}>
                {status.replace(/_/g, " ")}
              </span>
              {isCompleted && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                {formatDateTime(initial.createdAt)}
              </span>
              {isSuperAdmin && initial.shop?.name && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 font-medium text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <Store className="h-3 w-3 shrink-0" />
                    {initial.shop.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Completed lock banner */}
        {isCompleted && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            This repair is completed and can no longer be edited.
          </div>
        )}

        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          <RepairFormFields
            form={form}
            setForm={setForm}
            parts={parts}
            setParts={setParts}
            readonly={!editing}
          />

          {/* Status buttons */}
          {canEdit && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={saving || s === status}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      s === status
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted disabled:opacity-40"
                    )}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — only shown when editing */}
        {editing && (
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RepairsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSuperAdmin = user?.role === "ROOT_SUPER_ADMIN";
  const canEdit = ["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"].includes(user?.role);

  const [showNew, setShowNew]           = useState(false);
  const [selected, setSelected]         = useState<any>(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["repairs", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/repairs?${params}`);
      return res.json();
    },
  });

  const repairs = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />Repair Jobs
          </h1>
          <p className="page-subtitle">{repairs.length} repair{repairs.length !== 1 ? "s" : ""}</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Repair Job
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, device, order code..."
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input">
          <option value="">All Statuses</option>
          {["PENDING","IN_PROGRESS","WAITING_PARTS","READY","COMPLETED","CANCELLED"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th><th>Customer</th><th>Device</th><th>Issue</th>
              <th>Parts</th><th>Total</th><th>Status</th>
              {isSuperAdmin && <th>Shop</th>}
              <th>Engineer · Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={isSuperAdmin ? 10 : 9} className="py-12 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : repairs.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 10 : 9} className="py-16 text-center text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No repair jobs yet</p>
                </td>
              </tr>
            ) : repairs.map((r: any) => (
              <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                <td><span className="font-mono font-bold text-primary tracking-widest">{r.orderCode}</span></td>
                <td>
                  <p className="font-medium">{r.customerName}</p>
                  {r.customerPhone && <p className="text-xs text-muted-foreground">{r.customerPhone}</p>}
                </td>
                <td>
                  <p className="font-medium">{r.deviceType}</p>
                  {r.deviceModel && <p className="text-xs text-muted-foreground">{r.deviceModel}</p>}
                </td>
                <td className="max-w-[180px]"><p className="truncate text-sm">{r.issueDesc}</p></td>
                <td>{r.partsUsed?.length || 0}</td>
                <td className="font-semibold">{formatCurrency(r.totalAmount)}</td>
                <td>
                  <span className={cn("badge text-xs", STATUS_COLORS[r.status] || "badge-neutral")}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td>
                    {r.shop?.name ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Store className="h-3 w-3 shrink-0" />{r.shop.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                <td>
                  {r.engineerName && (
                    <p className="text-xs font-medium flex items-center gap-1">
                      <User className="h-3 w-3 text-primary" />{r.engineerName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatDateTime(r.createdAt)}
                  </p>
                </td>
                <td>
                  {r.status === "COMPLETED"
                    ? <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewRepairModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { refetch(); setShowNew(false); }}
        />
      )}
      {selected && (
        <RepairDetailModal
          repair={selected}
          onClose={() => { setSelected(null); refetch(); }}
          canEdit={canEdit}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}
