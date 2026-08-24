"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import {
  X, Tag, Package, ChevronDown, ChevronUp, Search,
  Plus, Loader2, FolderOpen, Folder, Boxes, DollarSign,
  BarChart3, Pencil, Trash2, Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Props { shopId?: string; onClose: () => void; }

function StatBadge({ icon: Icon, value, color }: { icon: any; value: string | number; color: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", color)}>
      <Icon size={9} /> {value}
    </span>
  );
}

export function CategoriesModal({ shopId, onClose }: Props) {
  const qc = useQueryClient();

  const [search, setSearch]           = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  // Create states
  const [showNewCat, setShowNewCat]   = useState(false);
  const [newCatName, setNewCatName]   = useState("");
  const [savingCat, setSavingCat]     = useState(false);
  const [showNewSub, setShowNewSub]   = useState<string | null>(null);
  const [newSubName, setNewSubName]   = useState("");
  const [savingSub, setSavingSub]     = useState(false);

  // Edit states
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [savingEdit, setSavingEdit]   = useState(false);

  // Delete states
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["categories-with-products", shopId],
    queryFn: () =>
      fetch(`/api/inventory/categories-detail${shopId ? `?shopId=${shopId}` : ""}`)
        .then(r => r.json()),
  });

  const categories: any[] = data?.data || [];

  const filtered = search.trim()
    ? categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.children?.some((s: any) => s.name.toLowerCase().includes(search.toLowerCase())) ||
        c.products?.some((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
      )
    : categories;

  const grandTotal = {
    categories:    categories.length,
    subCategories: categories.reduce((s: number, c: any) => s + c.subCategoryCount, 0),
    products:      categories.reduce((s: number, c: any) => s + c.totalProducts, 0),
    items:         categories.reduce((s: number, c: any) => s + c.totalItems, 0),
    value:         categories.reduce((s: number, c: any) => s + c.totalValue, 0),
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["categories-with-products"] });
    qc.invalidateQueries({ queryKey: ["inventory-stats"] });
    qc.invalidateQueries({ queryKey: ["categories-combobox"] });
  };

  // ── Create category ────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res  = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), shopId }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`"${newCatName.trim()}" created`);
        setNewCatName(""); setShowNewCat(false); invalidate();
      } else toast.error(d.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setSavingCat(false); }
  };

  // ── Create sub-category ────────────────────────────────────────
  const handleCreateSub = async (parentId: string, parentName: string) => {
    if (!newSubName.trim()) return;
    setSavingSub(true);
    try {
      const res  = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubName.trim(), shopId, parentId }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`"${newSubName.trim()}" added under "${parentName}"`);
        setNewSubName(""); setShowNewSub(null); invalidate();
      } else toast.error(d.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setSavingSub(false); }
  };

  // ── Edit category / sub-category ───────────────────────────────
  const startEdit = (id: string, name: string) => {
    setEditingId(id); setEditName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const res  = await fetch("/api/categories", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editName.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Category renamed");
        setEditingId(null); setEditName(""); invalidate();
      } else toast.error(d.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setSavingEdit(false); }
  };

  // ── Delete category / sub-category ────────────────────────────
  const handleDelete = async (id: string, name: string, productCount: number) => {
    if (productCount > 0) {
      toast.error(`Cannot delete "${name}" — ${productCount} products still linked. Reassign them first.`);
      return;
    }
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const d    = await res.json();
      if (d.success) {
        toast.success(`"${name}" deleted`);
        invalidate();
      } else toast.error(d.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setDeletingId(null); }
  };

  // ── Product row ────────────────────────────────────────────────
  const ProductRow = ({ p }: { p: any }) => {
    const isOut = p.stockQuantity === 0;
    const isLow = !isOut && p.stockQuantity <= p.lowStockThreshold;
    return (
      <tr className="border-b border-border/40 hover:bg-muted/20 transition-colors">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                : <Package size={12} className="text-muted-foreground/50" />}
            </div>
            <span className="font-medium text-xs">{p.name}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
        <td className="px-4 py-2.5 text-right text-xs font-medium">{formatCurrency(p.costPrice)}</td>
        <td className="px-4 py-2.5 text-right">
          <span className={cn("font-bold text-xs tabular-nums",
            isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-600")}>
            {p.stockQuantity}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
            isOut ? "bg-red-50 text-red-600 dark:bg-red-950/30"
              : isLow ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30")}>
            {isOut ? "Out" : isLow ? "Low" : "OK"}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
          {formatCurrency(Number(p.costPrice) * p.stockQuantity)}
        </td>
        <td className="px-4 py-2.5">
          <Link href={`/dashboard/inventory/${p.id}`} onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-flex">
            <BarChart3 size={13} />
          </Link>
        </td>
      </tr>
    );
  };

  const ProductTable = ({ products, label, value }: { products: any[]; label: string; value: number }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/20 border-b border-border">
          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Product</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">SKU</th>
          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Cost</th>
          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Stock</th>
          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Value</th>
          <th className="px-4 py-2"><span className="sr-only">View</span></th>
        </tr>
      </thead>
      <tbody>{products.map(p => <ProductRow key={p.id} p={p} />)}</tbody>
      <tfoot>
        <tr className="bg-muted/10 border-t border-border">
          <td colSpan={5} className="px-4 py-2 text-xs text-muted-foreground font-medium">{label}</td>
          <td className="px-4 py-2 text-right text-xs font-bold">{formatCurrency(value)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );

  // ── Inline name editor ─────────────────────────────────────────
  const NameEditor = ({ id, name, onDone }: { id: string; name: string; onDone: () => void }) => (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input
        value={editName}
        onChange={e => setEditName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") { setEditingId(null); } }}
        className="flex-1 form-input text-sm py-1.5 min-w-0"
        autoFocus
      />
      <button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}
        className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={() => setEditingId(null)}
        className="p-1.5 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground">
        <X size={13} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-600"><Tag size={16} className="text-white" /></div>
            <div>
              <h2 className="font-bold">Product Categories</h2>
              <p className="text-xs text-muted-foreground">
                {grandTotal.categories} categories · {grandTotal.subCategories} sub-categories · {grandTotal.products} products
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowNewCat(v => !v); setNewCatName(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> New Category
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Grand totals bar ── */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 shrink-0 flex gap-2 flex-wrap">
          <StatBadge icon={Package}     value={`${grandTotal.products} products`} color="bg-blue-50 text-blue-700 dark:bg-blue-950/30" />
          <StatBadge icon={Boxes}       value={`${grandTotal.items} items`}       color="bg-violet-50 text-violet-700 dark:bg-violet-950/30" />
          <StatBadge icon={DollarSign}  value={formatCurrency(grandTotal.value)}  color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" />
        </div>

        {/* ── New category form ── */}
        {showNewCat && (
          <div className="px-6 py-3 border-b border-border bg-primary/5 shrink-0">
            <p className="text-xs font-semibold text-primary mb-2">New Top-Level Category</p>
            <div className="flex gap-2">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateCategory()}
                placeholder="e.g. Phones, Accessories…" className="flex-1 form-input text-sm py-2" autoFocus />
              <button onClick={handleCreateCategory} disabled={savingCat || !newCatName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
                {savingCat ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
              </button>
              <button onClick={() => setShowNewCat(false)}
                className="px-3 py-2 border border-border rounded-lg text-xs hover:bg-muted transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="px-6 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search categories, sub-categories or products…"
              className="w-full pl-8 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Tag size={36} className="mb-2 opacity-20" /><p className="text-sm">No categories found</p>
            </div>
          ) : (
            filtered.map((cat: any) => {
              const isCatOpen  = expandedCat === cat.id;
              const isEditing  = editingId === cat.id;

              return (
                <div key={cat.id} className="border border-border rounded-xl overflow-hidden">

                  {/* ── Category header ── */}
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors",
                    isCatOpen ? "bg-pink-50/50 dark:bg-pink-950/10" : "hover:bg-muted/30"
                  )}>
                    {/* Folder icon */}
                    <button onClick={() => setExpandedCat(isCatOpen ? null : cat.id)}
                      className="mt-1 w-9 h-9 rounded-lg bg-pink-100 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                      {isCatOpen ? <FolderOpen size={16} className="text-pink-600" /> : <Folder size={16} className="text-pink-600" />}
                    </button>

                    {/* Name or editor */}
                    {isEditing ? (
                      <div className="flex-1 min-w-0 pt-1">
                        <NameEditor id={cat.id} name={cat.name} onDone={() => setEditingId(null)} />
                      </div>
                    ) : (
                      <button onClick={() => setExpandedCat(isCatOpen ? null : cat.id)}
                        className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm">{cat.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {cat.subCategoryCount > 0 && (
                            <StatBadge icon={Tag}         value={`${cat.subCategoryCount} sub-categories`} color="bg-pink-50 text-pink-700 dark:bg-pink-950/30" />
                          )}
                          <StatBadge icon={Package}       value={`${cat.totalProducts} products`}           color="bg-blue-50 text-blue-700 dark:bg-blue-950/30" />
                          <StatBadge icon={Boxes}         value={`${cat.totalItems} items`}                 color="bg-violet-50 text-violet-700 dark:bg-violet-950/30" />
                          <StatBadge icon={DollarSign}    value={formatCurrency(cat.totalValue)}            color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" />
                          {cat.outOfStock > 0 && (
                            <StatBadge icon={Package}     value={`${cat.outOfStock} out`}                  color="bg-red-50 text-red-600 dark:bg-red-950/30" />
                          )}
                        </div>
                      </button>
                    )}

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        <button onClick={() => { setShowNewSub(showNewSub === cat.id ? null : cat.id); setNewSubName(""); }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                          <Plus size={10} /> Sub-category
                        </button>
                        <button onClick={() => startEdit(cat.id, cat.name)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors" title="Rename">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name, cat.totalProducts)}
                          disabled={deletingId === cat.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40" title="Delete">
                          {deletingId === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                        <button onClick={() => setExpandedCat(isCatOpen ? null : cat.id)} className="text-muted-foreground p-1">
                          {isCatOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── New sub-category form ── */}
                  {showNewSub === cat.id && (
                    <div className="px-4 py-3 border-t border-dashed border-border bg-muted/20">
                      <p className="text-xs font-semibold text-primary mb-2">New Sub-category under "{cat.name}"</p>
                      <div className="flex gap-2">
                        <input value={newSubName} onChange={e => setNewSubName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleCreateSub(cat.id, cat.name)}
                          placeholder="e.g. iPhone, Samsung, Used…" className="flex-1 form-input text-sm py-2" autoFocus />
                        <button onClick={() => handleCreateSub(cat.id, cat.name)} disabled={savingSub || !newSubName.trim()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
                          {savingSub ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Save
                        </button>
                        <button onClick={() => setShowNewSub(null)}
                          className="px-3 py-2 border border-border rounded-lg text-xs hover:bg-muted transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* ── Expanded body ── */}
                  {isCatOpen && (
                    <div className="border-t border-border">

                      {/* Sub-categories */}
                      {cat.children?.length > 0 && (
                        <div className="p-3 space-y-2 bg-muted/5">
                          <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                            Sub-categories ({cat.children.length})
                          </p>
                          {cat.children.map((sub: any) => {
                            const isSubOpen    = expandedSub === sub.id;
                            const isEditingSub = editingId === sub.id;

                            return (
                              <div key={sub.id} className="border border-border/60 rounded-lg overflow-hidden bg-card">

                                {/* Sub-category header */}
                                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                  <button onClick={() => setExpandedSub(isSubOpen ? null : sub.id)}
                                    className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0 mt-0.5">
                                    <Tag size={13} className="text-violet-600" />
                                  </button>

                                  {isEditingSub ? (
                                    <div className="flex-1 min-w-0 pt-0.5">
                                      <NameEditor id={sub.id} name={sub.name} onDone={() => setEditingId(null)} />
                                    </div>
                                  ) : (
                                    <button onClick={() => setExpandedSub(isSubOpen ? null : sub.id)}
                                      className="flex-1 text-left min-w-0">
                                      <p className="font-semibold text-sm">{sub.name}</p>
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        <StatBadge icon={Package}    value={`${sub.totalProducts} products`} color="bg-blue-50 text-blue-700 dark:bg-blue-950/30" />
                                        <StatBadge icon={Boxes}      value={`${sub.totalItems} items`}       color="bg-violet-50 text-violet-700 dark:bg-violet-950/30" />
                                        <StatBadge icon={DollarSign} value={formatCurrency(sub.totalValue)}  color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" />
                                        {sub.outOfStock > 0 && (
                                          <StatBadge icon={Package}  value={`${sub.outOfStock} out`}         color="bg-red-50 text-red-600 dark:bg-red-950/30" />
                                        )}
                                      </div>
                                    </button>
                                  )}

                                  {!isEditingSub && (
                                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                      <button onClick={() => startEdit(sub.id, sub.name)}
                                        className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors" title="Rename">
                                        <Pencil size={12} />
                                      </button>
                                      <button onClick={() => handleDelete(sub.id, sub.name, sub.totalProducts)}
                                        disabled={deletingId === sub.id}
                                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40" title="Delete">
                                        {deletingId === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                      </button>
                                      <button onClick={() => setExpandedSub(isSubOpen ? null : sub.id)} className="text-muted-foreground p-1">
                                        {isSubOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Sub-category products */}
                                {isSubOpen && (
                                  <div className="border-t border-border">
                                    {sub.products?.length === 0 ? (
                                      <p className="px-5 py-4 text-xs text-muted-foreground text-center">No products in this sub-category</p>
                                    ) : (
                                      <ProductTable
                                        products={sub.products}
                                        label={`${sub.name} — ${sub.totalItems} items`}
                                        value={sub.totalValue}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Direct products */}
                      {cat.products?.length > 0 && (
                        <div className={cn(cat.children?.length > 0 ? "border-t border-dashed border-border" : "")}>
                          {cat.children?.length > 0 && (
                            <p className="text-xs font-semibold text-muted-foreground px-4 pt-3 pb-1">
                              Direct products — not in a sub-category ({cat.directTotalProducts})
                            </p>
                          )}
                          <ProductTable
                            products={cat.products}
                            label={`${cat.name} direct — ${cat.directTotalItems} items`}
                            value={cat.directTotalValue}
                          />
                        </div>
                      )}

                      {cat.products?.length === 0 && cat.children?.length === 0 && (
                        <p className="px-5 py-8 text-sm text-muted-foreground text-center">No products in this category yet</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            {grandTotal.categories} categories · {grandTotal.subCategories} sub-categories · {grandTotal.products} products · {grandTotal.items} items
          </p>
          <p className="text-sm font-bold">{formatCurrency(grandTotal.value)} total value</p>
        </div>
      </div>
    </div>
  );
}
