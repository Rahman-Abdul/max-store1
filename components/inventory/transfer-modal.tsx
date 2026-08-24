"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, X, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

interface Props {
  product: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ product, onClose, onSuccess }: Props) {
  const [toShopId, setToShopId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: shopsData } = useQuery({
    queryKey: ["shops-for-transfer"],
    queryFn: () => fetch("/api/shops").then(r => r.json()),
  });
  const shops = (shopsData?.data || []).filter(
    (s: any) => s.status === "ACTIVE" && s.id !== product.shopId
  );

  const handleTransfer = async () => {
    const qty = parseInt(quantity);
    if (!toShopId) { toast.error("Select a destination shop"); return; }
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
    if (qty > product.stockQuantity) { toast.error(`Max available: ${product.stockQuantity}`); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/products/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, fromShopId: product.shopId,
          toShopId, quantity: qty, notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        onSuccess();
      } else {
        toast.error(data.error || "Transfer failed");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <ArrowRight size={16} className="text-primary" /> Transfer Stock
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Product info */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                SKU: {product.sku} · Cost: {formatCurrency(product.costPrice)} · Stock: {product.stockQuantity}
              </p>
              <p className="text-xs text-muted-foreground">From: <span className="font-medium text-foreground">{product.shop?.name || "—"}</span></p>
            </div>
          </div>

          {/* From → To visual */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1 bg-muted rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">From</p>
              <p className="font-semibold">{product.shop?.name || "Current Shop"}</p>
              <p className="text-xs text-primary">{product.stockQuantity} in stock</p>
            </div>
            <ArrowRight size={20} className="text-primary shrink-0" />
            <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">To</p>
              {toShopId
                ? <p className="font-semibold text-primary">{shops.find((s: any) => s.id === toShopId)?.name}</p>
                : <p className="text-muted-foreground text-xs">Select below</p>
              }
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Destination Shop *</label>
            <select value={toShopId} onChange={e => setToShopId(e.target.value)} className="form-input w-full">
              <option value="">— Select destination shop —</option>
              {shops.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {shops.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No other active shops available</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Quantity to Transfer * (max {product.stockQuantity})
            </label>
            <input
              type="number" min="1" max={product.stockQuantity}
              value={quantity} onChange={e => setQuantity(e.target.value)}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reason for transfer..." className="form-input w-full" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleTransfer} disabled={loading || !toShopId}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            Transfer Stock
          </button>
        </div>
      </div>
    </div>
  );
}
