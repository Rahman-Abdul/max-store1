"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/actions/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import {
  X, Boxes, Package, Search, ChevronUp, ChevronDown,
  AlertTriangle, TrendingDown,
} from "lucide-react";
import Link from "next/link";

interface Props {
  shopId?: string;
  totalItems: number;
  onClose: () => void;
}

type SortKey = "name" | "stockQuantity" | "costPrice" | "value";
type SortDir = "asc" | "desc";

export function AllItemsModal({ shopId, totalItems, onClose }: Props) {
  const [search, setSearch]   = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("stockQuantity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter]   = useState<"all" | "in_stock" | "low" | "out">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["all-items-modal", shopId],
    queryFn: () => getProducts({ shopId, limit: 500, isActive: true }),
  });

  const allProducts: any[] = data?.data || [];

  // Search
  const searched = search.trim()
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.name || "").toLowerCase().includes(search.toLowerCase())
      )
    : allProducts;

  // Stock filter
  const filtered = filter === "out"      ? searched.filter(p => p.stockQuantity === 0)
    : filter === "low"                   ? searched.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold)
    : filter === "in_stock"              ? searched.filter(p => p.stockQuantity > p.lowStockThreshold)
    : searched;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: any, bv: any;
    if (sortKey === "name")          { av = a.name; bv = b.name; }
    else if (sortKey === "costPrice"){ av = Number(a.costPrice); bv = Number(b.costPrice); }
    else if (sortKey === "value")    { av = Number(a.costPrice) * a.stockQuantity; bv = Number(b.costPrice) * b.stockQuantity; }
    else                             { av = a.stockQuantity; bv = b.stockQuantity; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-muted-foreground/40" />;

  const totalValue    = sorted.reduce((s, p) => s + Number(p.costPrice) * p.stockQuantity, 0);
  const totalQty      = sorted.reduce((s, p) => s + p.stockQuantity, 0);
  const outCount      = allProducts.filter(p => p.stockQuantity === 0).length;
  const lowCount      = allProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
  const inStockCount  = allProducts.filter(p => p.stockQuantity > p.lowStockThreshold).length;

  const FILTERS = [
    { key: "all",      label: "All",        count: allProducts.length, color: "bg-muted text-foreground" },
    { key: "in_stock", label: "In Stock",   count: inStockCount,       color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
    { key: "low",      label: "Low Stock",  count: lowCount,           color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30" },
    { key: "out",      label: "Out of Stock", count: outCount,         color: "bg-red-50 text-red-600 dark:bg-red-950/30" },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600"><Boxes size={16} className="text-white" /></div>
            <div>
              <h2 className="font-bold">Total Available Items</h2>
              <p className="text-xs text-muted-foreground">
                {allProducts.length} products · <span className="font-semibold text-indigo-600">{totalItems.toLocaleString()} total items</span> in stock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Summary pills */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 shrink-0 flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                filter === f.key
                  ? "border-primary ring-1 ring-primary " + f.color
                  : "border-transparent " + f.color + " opacity-70 hover:opacity-100"
              )}>
              {f.label}
              <span className="font-bold">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or category…"
              className="w-full pl-8 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Boxes size={36} className="mb-2 opacity-20" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort("name")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                      Product <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort("costPrice")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground ml-auto">
                      Cost <SortIcon k="costPrice" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort("stockQuantity")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground ml-auto">
                      Items in Stock <SortIcon k="stockQuantity" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right">
                    <button onClick={() => handleSort("value")} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground ml-auto">
                      Stock Value <SortIcon k="value" />
                    </button>
                  </th>
                  <th className="px-4 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p: any, idx: number) => {
                  const isOut = p.stockQuantity === 0;
                  const isLow = !isOut && p.stockQuantity <= p.lowStockThreshold;
                  const val   = Number(p.costPrice) * p.stockQuantity;
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                              : <Package size={13} className="text-muted-foreground/50" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm leading-tight">{p.name}</p>
                            {p.supplier?.name && <p className="text-[10px] text-muted-foreground">{p.supplier.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3">
                        {p.category?.name
                          ? <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{p.category.name}</span>
                          : <span className="text-xs text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium">{formatCurrency(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn("font-bold text-sm tabular-nums",
                            isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-600")}>
                            {p.stockQuantity.toLocaleString()}
                          </span>
                          {/* Mini bar */}
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500")}
                              style={{ width: `${Math.min(100, (p.stockQuantity / (p.lowStockThreshold * 2)) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          isOut ? "bg-red-50 text-red-600 dark:bg-red-950/30"
                            : isLow ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30")}>
                          {isOut ? <><TrendingDown size={9} /> Out</>
                            : isLow ? <><AlertTriangle size={9} /> Low</>
                            : "✓ OK"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold">{formatCurrency(val)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/inventory/${p.id}`} onClick={onClose}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-flex">
                          <Package size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer totals */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{sorted.length} products shown</span>
            <span className="font-semibold text-indigo-600 text-sm">{totalQty.toLocaleString()} total items</span>
          </div>
          <p className="text-sm font-bold">{formatCurrency(totalValue)} stock value</p>
        </div>
      </div>
    </div>
  );
}
