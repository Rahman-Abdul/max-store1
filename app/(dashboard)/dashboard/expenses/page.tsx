"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getExpenses, createExpense, approveExpense } from "@/actions/operations";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Plus, Search, DollarSign, CheckCircle2, Clock, X,
  Loader2, TrendingDown, Filter, RefreshCw, Receipt
} from "lucide-react";
import { ExpenseCategoryCombobox } from "@/components/forms/expense-category-combobox";

const expenseIcons: Record<string, string> = {
  Salary: "👥", Fuel: "⛽", Rent: "🏢", Transport: "🚛",
  Maintenance: "🔧", "Utility Bills": "⚡", Miscellaneous: "📦", Restock: "📦",
};

async function fetchCategories() {
  const res = await fetch("/api/expenses/categories");
  return res.json();
}

async function fetchShops() {
  const res = await fetch("/api/shops");
  const data = await res.json();
  return data.data || [];
}

export default function ExpensesPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const qc = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["expenses", search, statusFilter, page],
    queryFn: () =>
      getExpenses({
        status: statusFilter as any || undefined,
        page,
        limit: 20,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: fetchCategories,
  });
  const categories = categoriesData?.data || categoriesData || [];

  const { data: shops = [] } = useQuery({
    queryKey: ["shops-list"],
    queryFn: fetchShops,
  });

  const expenses = data?.data || [];
  const pagination = data?.pagination;

  const totalApproved = expenses
    .filter((e: any) => e.status === "APPROVED")
    .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const totalPending = expenses
    .filter((e: any) => e.status === "PENDING")
    .reduce((s: number, e: any) => s + Number(e.amount), 0);

  const handleApprove = async (expenseId: string) => {
    try {
      await approveExpense(expenseId);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense approved");
    } catch (error: any) {
      toast.error("Failed to approve", { description: error.message });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "badge-warning",
      APPROVED: "badge-success",
      REJECTED: "badge-danger",
    };
    return map[status] || "badge-info";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track and manage business expenses</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown size={16} />
            <span className="text-xs font-medium">Total Approved</span>
          </div>
          <p className="text-2xl font-bold font-display text-red-600">{formatCurrency(totalApproved)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock size={16} />
            <span className="text-xs font-medium">Pending Approval</span>
          </div>
          <p className="text-2xl font-bold font-display text-amber-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Receipt size={16} />
            <span className="text-xs font-medium">Total Records</span>
          </div>
          <p className="text-2xl font-bold font-display">{pagination?.total || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={() => refetch()} className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors">
          <RefreshCw size={15} className="text-muted-foreground" />
        </button>
      </div>

      {/* Expenses table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <DollarSign size={48} className="mb-3 opacity-30" />
              <p className="font-medium">No expenses found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Shop</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Status</th>
                  {["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user?.role) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense: any) => (
                  <tr key={expense.id}>
                    <td>
                      <p className="font-medium text-sm">{expense.title}</p>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{expense.description}</p>
                      )}
                    </td>
                    <td>
                      <span className="text-sm">
                        {expenseIcons[expense.category?.name] || "📋"} {expense.category?.name}
                      </span>
                    </td>
                    <td className="font-semibold text-sm text-red-600">{formatCurrency(expense.amount)}</td>
                    <td className="text-sm">{expense.shop?.name || "—"}</td>
                    <td className="text-sm">{expense.createdBy?.name || "—"}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                    <td>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusBadge(expense.status))}>
                        {expense.status}
                      </span>
                    </td>
                    {["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user?.role) && (
                      <td>
                        {expense.status === "PENDING" && (
                          <button
                            onClick={() => handleApprove(expense.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAdd && (
        <AddExpenseModal
          shops={shops}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            qc.invalidateQueries({ queryKey: ["expenses"] });
            qc.invalidateQueries({ queryKey: ["expense-categories"] });
            toast.success("Expense added");
          }}
        />
      )}
    </div>
  );
}

function AddExpenseModal({ shops, categories, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [form, setForm] = useState({
    shopId: shops[0]?.id || "",
    title: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopId || !categoryName.trim() || !form.title || !form.amount) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      // Resolve category by name — find existing or create new
      const catRes  = await fetch("/api/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      const catData = await catRes.json();
      if (!catData.success) throw new Error(catData.error || "Failed to resolve category");

      await createExpense({
        shopId: form.shopId,
        categoryId: catData.data.id,
        title: form.title,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        expenseDate: new Date(form.expenseDate),
      });
      onSuccess();
    } catch (error: any) {
      toast.error("Failed to add expense", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-red-500" />
            <h2 className="font-bold">Add Expense</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Expense title" className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" required />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Category <span className="text-red-500">*</span>
            </label>
            <ExpenseCategoryCombobox
              categories={categories}
              value={categoryName}
              onChange={setCategoryName}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount (₦) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" min="0" step="0.01"
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Shop *</label>
              <select value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none" required>
                {shops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date *</label>
              <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="Optional details"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
