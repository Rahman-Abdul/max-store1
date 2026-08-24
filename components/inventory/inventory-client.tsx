"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, getLowStockProducts, updateProduct, deleteProduct } from "@/actions/inventory";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Search, Package, AlertTriangle, RefreshCw,
  Edit, Trash2, TrendingUp, Boxes, ArrowUp, BarChart3, X, Save, Loader2,
  ArrowLeftRight, ArrowRight, History, ChevronDown, ChevronUp,
  User, Clock, TrendingDown, MoveRight, Tag, Truck, DollarSign, ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { ProductFormModal } from "@/components/forms/product-form-modal";
import { RestockModal } from "@/components/inventory/restock-modal";
import { RecentlyAddedPanel } from "@/components/inventory/recently-added-panel";
import { CategorySupplierCombobox } from "@/components/forms/category-supplier-combobox";
import { CategoriesModal } from "@/components/inventory/categories-modal";
import { AllItemsModal } from "@/components/inventory/all-items-modal";
import { SuppliersModal } from "@/components/inventory/suppliers-modal";

interface Props { user: any }

// ── Helpers ──────────────────────────────────────────────────────
function getGroupLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - (todayStart.getDay() * 86400000));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= todayStart) return "Today";
  if (date >= yesterdayStart) return "Yesterday";
  if (date >= weekStart) return "This Week";
  if (date >= monthStart) return "This Month";
  if (diffDays < 60) return "Last Month";
  return "Older";
}

const GROUP_ORDER = ["Today", "Yesterday", "This Week", "This Month", "Last Month", "Older"];

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatLogDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const LOG_TYPE_META: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  RESTOCK:    { label: "Restock",   color: "text-emerald-600", bgColor: "bg-emerald-50",  icon: ArrowUp },
  ADJUSTMENT: { label: "Adjusted",  color: "text-blue-600",    bgColor: "bg-blue-50",     icon: ArrowLeftRight },
  SALE:       { label: "Sale",      color: "text-red-500",     bgColor: "bg-red-50",      icon: TrendingDown },
  TRANSFER:   { label: "Transfer",  color: "text-violet-600",  bgColor: "bg-violet-50",   icon: MoveRight },
  RETURN:     { label: "Return",    color: "text-amber-600",   bgColor: "bg-amber-50",    icon: ArrowUp },
};

// ── Main Component ────────────────────────────────────────────────
export function InventoryClient({ user }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "well_stocked" | "low_stock" | "out_of_stock">("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [restocking, setRestocking] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showActivity, setShowActivity] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_LIMIT = 30;

  const shopId = user.role === "ROOT_SUPER_ADMIN" ? undefined : user.shops?.[0]?.id;

  const { data: shopsData } = useQuery({
    queryKey: ["shops-for-product"],
    queryFn: () => fetch("/api/shops").then(r => r.json()),
    enabled: user.role === "ROOT_SUPER_ADMIN",
  });
  const allShops = shopsData?.data || [];
  const canEdit = ["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role);
  const canDelete = user.role === "ROOT_SUPER_ADMIN";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["products", shopId, search, filter, page],
    queryFn: () => getProducts({
      shopId,
      search: search || undefined,
      lowStockOnly: filter === "low_stock",
      outOfStockOnly: filter === "out_of_stock",
      wellStockedOnly: filter === "well_stocked",
      page,
      // Fetch more when filtering by stock status so JS filter has enough rows
      limit: filter !== "all" ? 200 : 20,
    }),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ["low-stock", shopId],
    queryFn: () => getLowStockProducts(shopId),
  });

  // Inventory summary stats
  const { data: statsData } = useQuery({
    queryKey: ["inventory-stats", shopId],
    queryFn: () => fetch(`/api/inventory/stats${shopId ? `?shopId=${shopId}` : ""}`).then(r => r.json()),
  });
  const invStats = statsData?.data || {};

  // Stock activity log
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["inventory-logs", shopId, activityPage],
    queryFn: () =>
      fetch(`/api/inventory/logs?${shopId ? `shopId=${shopId}&` : ""}page=${activityPage}&limit=${ACTIVITY_LIMIT}`)
        .then(r => r.json()),
    enabled: showActivity,
  });

  const products = data?.data || [];
  const pagination = data?.pagination;
  const lowStockProducts = (lowStockData?.data as any[]) || [];
  const lowStockCount = lowStockProducts.length;
  const outOfStockCount = lowStockProducts.filter((p: any) => p.stockQuantity === 0).length;
  const logs: any[] = logsData?.data || [];
  const logsPagination = logsData?.pagination;

  // Group logs by time period
  const groupedLogs = logs.reduce((acc: Record<string, any[]>, log: any) => {
    const group = getGroupLabel(new Date(log.createdAt));
    if (!acc[group]) acc[group] = [];
    acc[group].push(log);
    return acc;
  }, {});
  const sortedGroups = GROUP_ORDER.filter(g => groupedLogs[g]);

  const startEdit = (product: any) => {
    setEditing(product);
    setEditForm({
      name: product.name,
      barcode: product.barcode || "",
      description: product.description || "",
      costPrice: product.costPrice,
      lowStockThreshold: product.lowStockThreshold,
      category: product.category?.name || "",
      subCategory: "",
      supplier: product.supplier?.name || "",
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const result = await updateProduct(editing.id, {
        name: editForm.name,
        barcode: editForm.barcode || null,
        description: editForm.description || null,
        costPrice: Number(editForm.costPrice),
        lowStockThreshold: Number(editForm.lowStockThreshold),
        categoryName: editForm.subCategory?.trim() || editForm.category || undefined,
        parentCategoryName: editForm.subCategory?.trim() ? editForm.category : undefined,
        supplierName: editForm.supplier || undefined,
      });
      if (result.success) {
        toast.success("Product updated");
        setEditing(null);
        qc.invalidateQueries({ queryKey: ["products"] });
      }
    } catch (e: any) { toast.error(e.message || "Failed to update"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (product: any) => {
    if (!confirm(`Archive "${product.name}"? It will be hidden from POS but history preserved.`)) return;
    setDeleting(product.id);
    try {
      const result = await deleteProduct(product.id);
      if (result.success) {
        toast.success(`"${product.name}" archived`);
        qc.invalidateQueries({ queryKey: ["products"] });
      }
    } catch (e: any) { toast.error(e.message || "Failed to delete"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage products, stock levels, and movements</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* ── Stats Row 1: Stock Status (clickable filters) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: invStats.totalProducts ?? pagination?.total ?? 0,  color: "bg-blue-600",    icon: Package,      f: "all" },
          { label: "Well Stocked",   value: invStats.wellStocked  ?? 0,                        color: "bg-emerald-600", icon: TrendingUp,   f: "well_stocked" },
          { label: "Low Stock",      value: invStats.lowStock      ?? lowStockCount,            color: "bg-amber-600",   icon: AlertTriangle, f: "low_stock" },
          { label: "Out of Stock",   value: invStats.outOfStock    ?? outOfStockCount,          color: "bg-red-600",     icon: Boxes,         f: "out_of_stock" },
        ].map(({ label, value, color, icon: Icon, f }) => (
          <div key={label} onClick={() => setFilter(f as any)}
            className={cn("stat-card cursor-pointer transition-all", filter === f && "border-primary/40 bg-primary/5 ring-1 ring-primary/20")}>
            <div className={cn("p-2 rounded-xl w-fit", color)}><Icon size={18} className="text-white" /></div>
            <p className="text-2xl font-bold mt-3">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {filter === f && <p className="text-[10px] text-primary font-semibold mt-1 uppercase tracking-wide">Active filter</p>}
          </div>
        ))}
      </div>

      {/* ── Stats Row 2: Value, Items, Categories, Suppliers ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600 w-fit"><DollarSign size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Inventory Value</p>
              <p className="text-2xl font-bold">{formatCurrency(invStats.totalValue ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cost price × stock qty</p>
            </div>
          </div>
        </div>
        <div onClick={() => setShowAllItems(true)} className="stat-card cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 w-fit"><Boxes size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Available Items</p>
              <p className="text-2xl font-bold">{invStats.totalItems ?? 0}</p>
              <p className="text-xs text-indigo-600 font-medium mt-0.5">Click to view all →</p>
            </div>
          </div>
        </div>
        <div onClick={() => setShowCategories(true)} className="stat-card cursor-pointer hover:border-pink-400 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-600 w-fit"><Tag size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Product Categories</p>
              <p className="text-2xl font-bold">{invStats.totalCategories ?? 0}</p>
              <p className="text-xs text-pink-600 font-medium mt-0.5">Click to view all →</p>
            </div>
          </div>
        </div>
        <div onClick={() => setShowSuppliers(true)} className="stat-card cursor-pointer hover:border-cyan-400 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600 w-fit"><Truck size={18} className="text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Suppliers</p>
              <p className="text-2xl font-bold">{invStats.totalSuppliers ?? 0}</p>
              <p className="text-xs text-cyan-600 font-medium mt-0.5">Click to view all →</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active filter banner ── */}
      {filter !== "all" && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          <ShieldAlert size={15} className={filter === "out_of_stock" ? "text-red-500" : filter === "low_stock" ? "text-amber-500" : "text-emerald-500"} />
          <span className="text-sm font-medium">
            Showing <span className="text-primary font-semibold">{filter === "low_stock" ? "Low Stock" : filter === "out_of_stock" ? "Out of Stock" : "Well Stocked"}</span> products only
          </span>
          <button onClick={() => setFilter("all")}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <X size={12} /> Clear filter
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, SKU, barcode..."
            className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <button onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["inventory-logs"] }); }}
          className="px-4 py-2.5 border border-border rounded-xl hover:bg-muted transition-colors flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* ── Products Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package size={48} className="mb-3 opacity-30" />
              <p className="font-medium">No products found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th><th>SKU</th><th>Category</th><th>Cost Price</th>
                  <th>Stock</th><th>Status</th><th>Updated</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => {
                  const isLow = product.stockQuantity <= product.lowStockThreshold;
                  const isOut = product.stockQuantity === 0;
                  return (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/dashboard/inventory/${product.id}`}
                          className="flex items-center gap-3 hover:text-primary transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                            {product.image
                              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              : <Package size={16} className="text-muted-foreground/60" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            {product.supplier?.name && <p className="text-xs text-muted-foreground">{product.supplier.name}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="font-mono text-xs">{product.sku}</td>
                      <td className="text-sm">{product.category?.name || "—"}</td>
                      <td className="font-medium text-sm">{formatCurrency(product.costPrice)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-bold", isOut ? "text-red-600" : isLow ? "text-amber-600" : "")}>
                            {product.stockQuantity}
                          </span>
                          <span className="text-xs text-muted-foreground">/ {product.lowStockThreshold}</span>
                          <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500")}
                              style={{ width: `${Math.min(100, (product.stockQuantity / (product.lowStockThreshold * 2)) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={cn("badge text-xs", isOut ? "badge-danger" : isLow ? "badge-warning" : "badge-success")}>
                          {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">{formatDate(product.updatedAt)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button onClick={() => setRestocking(product)} title="Restock"
                              className="p-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-muted-foreground transition-colors">
                              <ArrowUp size={15} />
                            </button>
                          )}
                          {user.role === "ROOT_SUPER_ADMIN" && (
                            <button onClick={() => setTransferring(product)} title="Transfer to another shop"
                              className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors">
                              <ArrowRight size={15} />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => startEdit(product)} title="Edit"
                              className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-muted-foreground transition-colors">
                              <Edit size={15} />
                            </button>
                          )}
                          <Link href={`/dashboard/inventory/${product.id}`} title="View Details"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                            <BarChart3 size={15} />
                          </Link>
                          {canDelete && (
                            <button onClick={() => handleDelete(product)} title="Archive"
                              disabled={deleting === product.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-colors disabled:opacity-40">
                              {deleting === product.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          )}
                        </div>
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
            <p className="text-sm text-muted-foreground">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Recently Added Products ── */}
      <RecentlyAddedPanel shopId={shopId} />

      {/* ── Stock Activity Log ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Collapsible header */}
        <button
          onClick={() => setShowActivity(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <History size={16} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Stock Activity</p>
              <p className="text-xs text-muted-foreground">All restocks, adjustments, transfers — who did it and when</p>
            </div>
          </div>
          {showActivity ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>

        {showActivity && (
          <>
            {logsLoading ? (
              <div className="p-6 space-y-3 border-t border-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 skeleton rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground border-t border-border">
                <Clock size={36} className="mb-2 opacity-25" />
                <p className="text-sm font-medium">No activity recorded yet</p>
              </div>
            ) : (
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock Before → After</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Done By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroups.map(group => (
                      <React.Fragment key={group}>
                        {/* Group header row */}
                        <tr className="bg-muted/20">
                          <td colSpan={8} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{group}</span>
                              <span className="text-xs text-muted-foreground/60">— {groupedLogs[group].length} {groupedLogs[group].length === 1 ? "entry" : "entries"}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Log rows */}
                        {groupedLogs[group].map((log: any) => {
                          const meta = LOG_TYPE_META[log.type] || { label: log.type, color: "text-muted-foreground", bgColor: "bg-muted", icon: Clock };
                          const Icon = meta.icon;
                          const isPositive = log.quantityChange > 0;
                          const logDate = new Date(log.createdAt);

                          return (
                            <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              {/* Product */}
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-sm leading-tight">{log.product?.name || "—"}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{log.product?.sku || ""}</p>
                                </div>
                              </td>

                              {/* Type badge */}
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", meta.bgColor, meta.color)}>
                                  <Icon size={11} />
                                  {meta.label}
                                </span>
                              </td>

                              {/* Change */}
                              <td className="px-4 py-3 text-right">
                                <span className={cn("font-bold text-sm tabular-nums", isPositive ? "text-emerald-600" : "text-red-500")}>
                                  {isPositive ? "+" : ""}{log.quantityChange}
                                </span>
                              </td>

                              {/* Before → After */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {log.quantityBefore}
                                  <span className="mx-1 text-muted-foreground/40">→</span>
                                  <span className="font-semibold text-foreground">{log.quantityAfter}</span>
                                </span>
                              </td>

                              {/* Done by */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                    <User size={10} className="text-primary" />
                                  </div>
                                  <span className="text-xs font-medium">{log.user?.name || "System"}</span>
                                </div>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatLogDate(logDate)}</span>
                              </td>

                              {/* Time */}
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-muted-foreground">{formatTime(logDate)}</span>
                              </td>

                              {/* Notes */}
                              <td className="px-4 py-3 max-w-[180px]">
                                <p className="text-xs text-muted-foreground truncate" title={log.notes || ""}>
                                  {log.notes || <span className="opacity-30">—</span>}
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Activity pagination */}
                {logsPagination && logsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {(activityPage - 1) * ACTIVITY_LIMIT + 1}–{Math.min(activityPage * ACTIVITY_LIMIT, logsPagination.total)} of {logsPagination.total} entries
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1}
                        className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                        Previous
                      </button>
                      <button onClick={() => setActivityPage(p => Math.min(logsPagination.totalPages, p + 1))} disabled={activityPage === logsPagination.totalPages}
                        className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" /> Edit Product
              </h2>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name</label>
                <input type="text" value={editForm.name ?? ""} placeholder="Product name"
                  onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                  className="form-input w-full" />
              </div>
              {/* Barcode */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Barcode</label>
                <input type="text" value={editForm.barcode ?? ""} placeholder="e.g. 8901234567890"
                  onChange={e => setEditForm((f: any) => ({ ...f, barcode: e.target.value }))}
                  className="form-input w-full" />
              </div>
              {/* Category combobox */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Category
                  {editing?.category?.name && !editForm.category && (
                    <span className="ml-2 text-[10px] text-amber-500">Currently: {editing.category.name}</span>
                  )}
                </label>
                <CategorySupplierCombobox
                  type="category"
                  shopId={editing?.shopId || shopId}
                  value={editForm.category || ""}
                  onChange={val => setEditForm((f: any) => ({ ...f, category: val, subCategory: "" }))}
                  placeholder="Type or pick a category…"
                />
              </div>
              {/* Sub-category — shown when category is filled */}
              {editForm.category?.trim() && (
                <div className="pl-4 border-l-2 border-primary/20">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Sub-category
                    <span className="ml-2 text-muted-foreground/60 font-normal">(optional)</span>
                  </label>
                  <CategorySupplierCombobox
                    type="category"
                    shopId={editing?.shopId || shopId}
                    value={editForm.subCategory || ""}
                    onChange={val => setEditForm((f: any) => ({ ...f, subCategory: val }))}
                    placeholder={`Sub-category under "${editForm.category}"…`}
                  />
                  {editForm.subCategory?.trim() && (
                    <p className="text-[10px] text-primary mt-1 font-medium">
                      Will be filed under: <strong>{editForm.category}</strong> → <strong>{editForm.subCategory}</strong>
                    </p>
                  )}
                </div>
              )}
              {/* Supplier combobox */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Supplier</label>
                <CategorySupplierCombobox
                  type="supplier"
                  shopId={editing?.shopId || shopId}
                  value={editForm.supplier || ""}
                  onChange={val => setEditForm((f: any) => ({ ...f, supplier: val }))}
                  placeholder="Type or pick a supplier…"
                />
              </div>
              {/* Cost Price */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cost Price (₦)</label>
                <input type="number" value={editForm.costPrice ?? ""} placeholder="0"
                  onChange={e => setEditForm((f: any) => ({ ...f, costPrice: e.target.value }))}
                  className="form-input w-full" />
              </div>
              {/* Low Stock Threshold */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Low Stock Threshold</label>
                <input type="number" value={editForm.lowStockThreshold ?? ""} placeholder="5"
                  onChange={e => setEditForm((f: any) => ({ ...f, lowStockThreshold: e.target.value }))}
                  className="form-input w-full" />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea value={editForm.description || ""} rows={2}
                  onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                  className="form-input w-full" />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditing(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProduct && (
        <ProductFormModal
          shopId={shopId || user.shops?.[0]?.id}
          onClose={() => setShowAddProduct(false)}
          onSuccess={() => {
            setShowAddProduct(false);
            qc.invalidateQueries({ queryKey: ["products"] });
            qc.invalidateQueries({ queryKey: ["inventory-logs"] });
            toast.success("Product added");
          }}
        />
      )}

      {restocking && (
        <RestockModal
          product={restocking}
          onClose={() => setRestocking(null)}
          onSuccess={() => {
            setRestocking(null);
            qc.invalidateQueries({ queryKey: ["products"] });
            qc.invalidateQueries({ queryKey: ["low-stock"] });
            qc.invalidateQueries({ queryKey: ["inventory-logs"] });
            toast.success("Stock updated");
          }}
        />
      )}

      {showAllItems && (
        <AllItemsModal shopId={shopId} totalItems={invStats.totalItems ?? 0} onClose={() => setShowAllItems(false)} />
      )}

      {showCategories && (
        <CategoriesModal shopId={shopId} onClose={() => setShowCategories(false)} />
      )}

      {showSuppliers && (
        <SuppliersModal shopId={shopId} onClose={() => setShowSuppliers(false)} />
      )}

      {transferring && (
        <TransferModal
          product={transferring}
          shops={allShops}
          onClose={() => setTransferring(null)}
          onSuccess={() => {
            setTransferring(null);
            qc.invalidateQueries({ queryKey: ["products"] });
            qc.invalidateQueries({ queryKey: ["inventory-logs"] });
            toast.success("Transfer complete");
          }}
        />
      )}
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────────────
interface TransferModalProps { product: any; shops: any[]; onClose: () => void; onSuccess: () => void; }

function TransferModal({ product, shops, onClose, onSuccess }: TransferModalProps) {
  const [toShopId, setToShopId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const otherShops = shops.filter(s => s.id !== product.shopId && s.status !== "INACTIVE");

  const handleTransfer = async () => {
    if (!toShopId) { toast.error("Select destination shop"); return; }
    if (quantity <= 0 || quantity > product.stockQuantity) {
      toast.error(`Quantity must be between 1 and ${product.stockQuantity}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, fromShopId: product.shopId, toShopId, quantity, notes }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); onSuccess(); }
      else toast.error(data.error || "Transfer failed");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-primary" /> Transfer Product
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg text-muted-foreground"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="font-semibold">{product.name}</p>
            <p className="text-muted-foreground text-xs">{product.sku} · From: {product.shop?.name}</p>
            <p className="text-primary font-medium mt-1">Available: {product.stockQuantity} units</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Destination Shop *</label>
            <select value={toShopId} onChange={e => setToShopId(e.target.value)} className="form-input w-full">
              <option value="">— Select destination shop —</option>
              {otherShops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {otherShops.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No other active shops available</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Quantity to Transfer *</label>
            <input type="number" min="1" max={product.stockQuantity} value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="form-input w-full" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reason for transfer..." className="form-input w-full" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleTransfer} disabled={loading || !toShopId}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowLeftRight size={15} />}
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
