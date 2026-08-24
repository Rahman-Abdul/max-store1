"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import { X, Truck, Package, ChevronDown, ChevronUp, Search, Phone, Mail } from "lucide-react";
import Link from "next/link";

interface Props {
  shopId?: string;
  onClose: () => void;
}

export function SuppliersModal({ shopId, onClose }: Props) {
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers-with-products", shopId],
    queryFn: () =>
      fetch(`/api/inventory/suppliers-detail${shopId ? `?shopId=${shopId}` : ""}`)
        .then(r => r.json()),
  });

  const suppliers: any[] = data?.data || [];

  const filtered = search.trim()
    ? suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.products?.some((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
      )
    : suppliers;

  const totalProducts = suppliers.reduce((s: number, sup: any) => s + (sup.products?.length || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600"><Truck size={16} className="text-white" /></div>
            <div>
              <h2 className="font-bold">Suppliers</h2>
              <p className="text-xs text-muted-foreground">
                {suppliers.length} suppliers · {totalProducts} products supplied
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search suppliers or products…"
              className="w-full pl-8 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Truck size={36} className="mb-2 opacity-20" />
              <p className="text-sm">No suppliers found</p>
            </div>
          ) : (
            filtered.map((sup: any) => {
              const isOpen   = expanded === sup.id;
              const supValue = sup.products?.reduce((s: number, p: any) => s + Number(p.costPrice) * p.stockQuantity, 0) || 0;

              return (
                <div key={sup.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Supplier row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : sup.id)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center shrink-0">
                      <Truck size={16} className="text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{sup.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {sup.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone size={10} /> {sup.phone}
                          </span>
                        )}
                        {sup.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail size={10} /> {sup.email}
                          </span>
                        )}
                        {!sup.phone && !sup.email && (
                          <span className="text-xs text-muted-foreground">
                            {sup.products?.length || 0} products · {formatCurrency(supValue)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-cyan-600">{sup.products?.length || 0} products</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(supValue)}</p>
                      </div>
                      {isOpen ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Products */}
                  {isOpen && (
                    <div className="border-t border-border">
                      {!sup.products?.length ? (
                        <p className="px-5 py-4 text-sm text-muted-foreground text-center">No products from this supplier</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/20 border-b border-border">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Product</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">SKU</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Category</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Cost</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Stock</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                              <th className="px-4 py-2"><span className="sr-only">View</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sup.products.map((p: any) => {
                              const isOut = p.stockQuantity === 0;
                              const isLow = !isOut && p.stockQuantity <= p.lowStockThreshold;
                              return (
                                <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                        {p.image
                                          ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                          : <Package size={12} className="text-muted-foreground/50" />}
                                      </div>
                                      <span className="font-medium text-xs">{p.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {p.category?.name
                                      ? <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full">{p.category.name}</span>
                                      : <span className="text-xs text-muted-foreground/40">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-xs font-medium">{formatCurrency(p.costPrice)}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span className={cn("font-bold text-xs tabular-nums",
                                      isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-600")}>
                                      {p.stockQuantity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                                      isOut ? "bg-red-50 text-red-600" : isLow ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>
                                      {isOut ? "Out" : isLow ? "Low" : "OK"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Link href={`/dashboard/inventory/${p.id}`}
                                      onClick={onClose}
                                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-flex">
                                      <Package size={13} />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/10 border-t border-border">
                              <td colSpan={6} className="px-4 py-2 text-xs text-muted-foreground font-medium">
                                Supplier stock value
                              </td>
                              <td className="px-4 py-2 text-right text-xs font-bold">{formatCurrency(supValue)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
