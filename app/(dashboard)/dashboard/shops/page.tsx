"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Store, Plus, Pencil, Trash2, Loader2, RefreshCw,
  Package, Users, ShoppingBag, TrendingUp, DollarSign,
  Eye, CheckCircle2, XCircle,
} from "lucide-react";
import Link from "next/link";

export default function ShopsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [form, setForm]             = useState({
    name: "", description: "", address: "", phone: "", email: "",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["shops-admin"],
    queryFn:  () => fetch("/api/shops").then(r => r.json()),
    staleTime: 0, // always fresh
  });

  const shops: any[] = data?.data || [];

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", address: "", phone: "", email: "" });
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name:        s.name        || "",
      description: s.description || "",
      address:     s.address     || "",
      phone:       s.phone       || "",
      email:       s.email       || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/shops/${editing.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        toast.success("Shop updated");
      } else {
        const res = await fetch("/api/shops", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        toast.success("Shop created");
      }
      setShowModal(false);
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      qc.invalidateQueries({ queryKey: ["shops-list"] });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? This will mark it as inactive.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/shops?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Shop deactivated");
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  // Grand totals across all shops
  const grandTotals = shops.reduce((acc, s) => ({
    products: acc.products + (s._count?.products || 0),
    sales:    acc.sales    + (s._count?.sales    || 0),
    staff:    acc.staff    + (s._count?.users    || 0),
    revenue:  acc.revenue  + (s.totalRevenue     || 0),
    profit:   acc.profit   + (s.totalProfit      || 0),
  }), { products: 0, sales: 0, staff: 0, revenue: 0, profit: 0 });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Shops</h1>
          <p className="page-subtitle">{shops.length} shop{shops.length !== 1 ? "s" : ""} in system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus size={16} /> Add Shop
          </button>
        </div>
      </div>

      {/* Grand total summary bar */}
      {shops.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Products", value: grandTotals.products, icon: Package,     color: "text-blue-600"    },
            { label: "Total Staff",    value: grandTotals.staff,    icon: Users,       color: "text-violet-600"  },
            { label: "Total Sales",    value: grandTotals.sales,    icon: ShoppingBag, color: "text-emerald-600" },
            { label: "Total Revenue",  value: formatCurrency(grandTotals.revenue), icon: DollarSign,  color: "text-emerald-600" },
            { label: "Total Profit",   value: formatCurrency(grandTotals.profit),  icon: TrendingUp,  color: "text-blue-600"    },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={cn("text-lg font-bold", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Shop cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-52 skeleton rounded-xl" />)}
        </div>
      ) : shops.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Store size={40} className="mx-auto mb-3 opacity-20" />
          <p>No shops yet — add one above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map(shop => (
            <div key={shop.id} className="bg-card border border-border rounded-xl p-5 space-y-4">

              {/* Shop header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Store size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{shop.name}</p>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      shop.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-muted text-muted-foreground"
                    )}>
                      {shop.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`/dashboard/shops/${shop.id}`}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="View">
                    <Eye size={14} />
                  </Link>
                  <button onClick={() => openEdit(shop)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(shop.id, shop.name)}
                    disabled={deleting === shop.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 disabled:opacity-40 transition-colors" title="Deactivate">
                    {deleting === shop.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Address */}
              {shop.address && (
                <p className="text-xs text-muted-foreground">{shop.address}</p>
              )}

              {/* Stats — sourced directly from _count (DB-accurate) */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Package,     label: "Products", value: shop._count?.products ?? 0 },
                  { icon: Users,       label: "Staff",    value: shop._count?.users    ?? 0 },
                  { icon: ShoppingBag, label: "Sales",    value: shop._count?.sales    ?? 0 },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <Icon size={13} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue + Profit — aggregated from completed sales in DB */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Revenue</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(shop.totalRevenue ?? 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Profit</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(shop.totalProfit ?? 0)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold">{editing ? "Edit Shop" : "Add Shop"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
                <XCircle size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Shop Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  required placeholder="Lucky Star Communications" className="form-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+234..." className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="shop@email.com" className="form-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Lagos, Nigeria" className="form-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Optional description" className="form-input w-full" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
