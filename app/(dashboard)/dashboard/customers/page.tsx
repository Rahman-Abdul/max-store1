"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate, getBuyerTypeLabel, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users, Search, Plus, Phone, Mail, CreditCard,
  RefreshCw, Eye, X, Loader2, ShoppingCart
} from "lucide-react";
import Link from "next/link";

async function fetchCustomers(params: { search?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  const res = await fetch(`/api/customers?${sp}`);
  return res.json();
}

async function createCustomer(data: any) {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => fetchCustomers({ search: search || undefined, page }),
  });

  const customers = data?.data || [];
  const pagination = data?.pagination;

  const buyerColors: Record<string, string> = {
    ENGINEER: "badge-purple",
    REGULAR_BUYER: "badge-success",
    WHOLESALER: "badge-info",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage customer profiles, purchase history, and debts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="p-2 bg-blue-600 rounded-xl w-fit">
            <Users size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">{pagination?.total || 0}</p>
          <p className="text-sm text-muted-foreground">Total Customers</p>
        </div>
        <div className="stat-card">
          <div className="p-2 bg-violet-600 rounded-xl w-fit">
            <Users size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">
            {customers.filter((c: any) => c.buyerType === "ENGINEER").length}
          </p>
          <p className="text-sm text-muted-foreground">Engineers</p>
        </div>
        <div className="stat-card">
          <div className="p-2 bg-blue-400 rounded-xl w-fit">
            <Users size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">
            {customers.filter((c: any) => c.buyerType === "WHOLESALER").length}
          </p>
          <p className="text-sm text-muted-foreground">Wholesalers</p>
        </div>
        <div className="stat-card">
          <div className="p-2 bg-red-600 rounded-xl w-fit">
            <CreditCard size={18} className="text-white" />
          </div>
          <p className="text-2xl font-bold font-display mt-3">
            {formatCurrency(customers.reduce((s: number, c: any) => s + Number(c.debtBalance || 0), 0))}
          </p>
          <p className="text-sm text-muted-foreground">Total Debts</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button onClick={() => refetch()} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
          <RefreshCw size={15} className="text-muted-foreground" />
        </button>
      </div>

      {/* Customers table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 skeleton rounded-lg" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users size={48} className="mb-3 opacity-30" />
              <p className="font-medium">No customers found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Buyer Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Debt Balance</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer: any) => (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="flex items-center gap-3 hover:text-primary transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{customer.address}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", buyerColors[customer.buyerType] || "badge-info")}>
                        {getBuyerTypeLabel(customer.buyerType)}
                      </span>
                    </td>
                    <td>
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm hover:text-primary transition-colors">
                          <Phone size={13} className="text-muted-foreground" />
                          {customer.phone}
                        </a>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {customer.email || "—"}
                    </td>
                    <td>
                      <span className={cn(
                        "text-sm font-semibold",
                        Number(customer.debtBalance) > 0 ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {Number(customer.debtBalance) > 0
                          ? formatCurrency(customer.debtBalance)
                          : "—"}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">{formatDate(customer.createdAt)}</td>
                    <td>
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary inline-flex"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">{pagination.total} total customers</p>
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

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ["customers"] });
            toast.success("Customer added");
          }}
        />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "",
    buyerType: "REGULAR_BUYER", shopId: "",
  });

  // Get shopId from session
  const [shopId, setShopId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Customer name is required"); return; }
    setLoading(true);
    try {
      const result = await createCustomer({ ...form, shopId: form.shopId || shopId });
      if (result.success) onSuccess();
      else toast.error(result.error || "Failed to create customer");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="font-bold">Add Customer</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: "name", label: "Full Name *", placeholder: "Customer name", required: true },
            { key: "phone", label: "Phone", placeholder: "+234 800 000 0000" },
            { key: "email", label: "Email", placeholder: "customer@example.com" },
            { key: "address", label: "Address", placeholder: "Customer address" },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
              <input
                type="text"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                required={required}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Buyer Type</label>
            <select
              value={form.buyerType}
              onChange={(e) => setForm({ ...form, buyerType: e.target.value })}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none"
            >
              <option value="REGULAR_BUYER">Regular Buyer</option>
              <option value="ENGINEER">Engineer</option>
              <option value="WHOLESALER">Wholesaler</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold
                         hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
