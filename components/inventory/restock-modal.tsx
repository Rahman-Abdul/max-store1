"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X, Loader2, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RestockModalProps {
  product: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockModal({ product, onClose, onSuccess }: RestockModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setLoading(true);
    try {
      const { restockProduct } = await import("@/actions/inventory");
      await restockProduct({
        productId: product.id,
        quantity: qty,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to restock", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowUp size={18} className="text-emerald-600" />
            <h2 className="font-bold">Restock Product</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-lg">📦</span>
            </div>
            <div>
              <p className="font-semibold text-sm">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                Current stock: <span className="font-medium">{product.stockQuantity}</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Quantity to Add *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              min="1"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/30 text-center text-lg font-bold"
              required
              autoFocus
            />
            {quantity && parseInt(quantity) > 0 && (
              <p className="text-xs text-muted-foreground mt-1 text-center">
                New stock: <span className="font-semibold text-foreground">
                  {product.stockQuantity + parseInt(quantity)}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              New Cost Price (₦) — optional
            </label>
            <input
              type="number"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder={`Current: ${formatCurrency(product.costPrice)}`}
              min="0"
              step="0.01"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplier batch #123"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
              Add Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
