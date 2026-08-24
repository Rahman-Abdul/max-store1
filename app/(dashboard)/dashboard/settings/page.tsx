"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn, getInitials, formatDate } from "@/lib/utils";
import {
  Users, Plus, Search, Lock, UserX, UserCheck, Trash2,
  Store, Shield, ChevronDown, Loader2, X, Save, Eye, EyeOff
} from "lucide-react";

const ROLES = [
  { value: "SHOP_ADMIN",  label: "Shop Admin",  color: "bg-blue-100 text-blue-700" },
  { value: "STAFF",       label: "Sales Staff", color: "bg-green-100 text-green-700" },
  { value: "CASHIER",     label: "Cashier",     color: "bg-amber-100 text-amber-700" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isRSA = user?.role === "ROOT_SUPER_ADMIN";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const { data: staffData, refetch } = useQuery({
    queryKey: ["all-staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff?limit=100");
      return res.json();
    },
  });
  const { data: shopsData } = useQuery({
    queryKey: ["shops"],
    queryFn: () => fetch("/api/shops").then(r => r.json()),
  });

  const allStaff = staffData?.data || [];
  const shops    = shopsData?.data || [];

  const filtered = allStaff.filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColor: Record<string, string> = {
    ROOT_SUPER_ADMIN: "bg-purple-100 text-purple-700",
    SHOP_ADMIN:       "bg-blue-100 text-blue-700",
    STAFF:            "bg-green-100 text-green-700",
    CASHIER:          "bg-amber-100 text-amber-700",
    INACTIVE:         "bg-red-100 text-red-700",
  };

  const handleToggleStatus = async (member: any) => {
    const newStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const res = await fetch(`/api/staff/${member.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    const data = await res.json();
    if (data.success) { toast.success("Status updated"); refetch(); }
    else toast.error(data.error || "Failed");
  };

  const handleDelete = async (member: any) => {
    if (!confirm(`Delete ${member.name}? Their history will be preserved.`)) return;
    const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success(`${member.name} deleted`); refetch(); setEditUser(null); }
    else toast.error(data.error || "Failed");
  };

  const handleAssignShop = async (userId: string, shopId: string) => {
    const res = await fetch("/api/staff/assign-shop", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, shopId }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Shop assigned"); refetch(); }
    else toast.error(data.error || "Failed");
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/staff/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const data = await res.json();
    if (data.success) { toast.success("Role updated"); refetch(); if (editUser?.id === userId) setEditUser({ ...editUser, role }); }
    else toast.error(data.error || "Failed");
  };

  if (!isRSA) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Shield size={48} className="mb-4 opacity-30" />
        <p className="font-medium">Root Super Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Create, assign, and manage all staff and their roles</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={16} /> Create User
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ROLES.map(r => (
          <div key={r.value} className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold">{allStaff.filter((s: any) => s.role === r.value && s.status === "ACTIVE").length}</p>
            <p className="text-sm text-muted-foreground">{r.label}s</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff..." className="form-input pl-9 w-full" />
      </div>

      {/* Staff table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Shop</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((member: any) => (
              <tr key={member.id} className="cursor-pointer" onClick={() => setEditUser(member)}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{member.email}</td>
                <td>
                  <span className={cn("badge text-xs", roleColor[member.role] || "bg-muted text-muted-foreground")}>
                    {member.role?.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="text-sm">
                  {member.shopAssignments?.map((s: any) => s.shop?.name).join(", ") || <span className="text-muted-foreground">Unassigned</span>}
                </td>
                <td>
                  <span className={cn("badge text-xs", member.status === "ACTIVE" ? "badge-success" : member.status === "SUSPENDED" ? "badge-warning" : "badge-danger")}>
                    {member.status}
                  </span>
                </td>
                <td className="text-xs text-muted-foreground">{member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleStatus(member)} title={member.status === "ACTIVE" ? "Suspend" : "Activate"}
                      className={cn("p-1.5 rounded-lg transition-colors", member.status === "ACTIVE" ? "text-amber-500 hover:bg-amber-50" : "text-green-600 hover:bg-green-50")}>
                      {member.status === "ACTIVE" ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                    {member.id !== user.id && (
                      <button onClick={() => handleDelete(member)} title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground"><Users size={36} className="mx-auto mb-2 opacity-30" /><p>No staff found</p></div>
        )}
      </div>

      {/* ── CREATE USER MODAL ─────────────────────────────── */}
      {showCreate && <CreateUserModal shops={shops} onClose={() => setShowCreate(false)} onSuccess={() => { refetch(); setShowCreate(false); }} />}

      {/* ── EDIT USER MODAL ───────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2"><Users size={16} className="text-primary" /> {editUser.name}</h2>
              <button onClick={() => setEditUser(null)} className="p-1 hover:bg-muted rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} onClick={() => handleChangeRole(editUser.id, r.value)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all",
                        editUser.role === r.value ? r.color + " border-current" : "border-border hover:bg-muted")}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Assign to Shop</label>
                <select onChange={e => { if (e.target.value) handleAssignShop(editUser.id, e.target.value); }}
                  className="form-input w-full" defaultValue="">
                  <option value="">Select a shop to assign…</option>
                  {shops.filter((s: any) => s.status === "ACTIVE").map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {editUser.shopAssignments?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editUser.shopAssignments.map((a: any) => (
                      <span key={a.id} className="badge badge-info text-xs">{a.shop?.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <ResetPasswordInline userId={editUser.id} userName={editUser.name} />
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Close</button>
              {editUser.id !== user.id && (
                <button onClick={() => handleDelete(editUser)}
                  className="flex-1 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={14} /> Delete User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetPasswordInline({ userId, userName }: { userId: string; userName: string }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (pwd.length < 6) { toast.error("Min 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${userId}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: pwd }) });
      const data = await res.json();
      if (data.success) { toast.success(`Password reset for ${userName}`); setPwd(""); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Error"); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-2">Reset Password</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="New password (min 6 chars)" className="form-input w-full pr-9" />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={handleReset} disabled={loading || pwd.length < 6}
          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        </button>
      </div>
    </div>
  );
}

function CreateUserModal({ shops, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    name: "", email: "", username: "", password: "", role: "STAFF", shopId: "", phone: "",
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      toast.error("Name, email, password, and role are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${form.name} created successfully`);
        onSuccess();
      } else {
        toast.error(data.error || "Failed to create user");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2"><Plus size={16} className="text-primary" /> Create Staff Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          {[
            { field: "name",     label: "Full Name *",   type: "text",     placeholder: "John Doe" },
            { field: "email",    label: "Email *",        type: "email",    placeholder: "john@example.com" },
            { field: "username", label: "Username",       type: "text",     placeholder: "johndoe (optional)" },
            { field: "phone",    label: "Phone",          type: "tel",      placeholder: "+234..." },
          ].map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
              <input type={type} value={(form as any)[field]} placeholder={placeholder}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="form-input w-full" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters" className="form-input w-full pr-9" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role *</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm(f => ({ ...f, role: r.value }))}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all",
                    form.role === r.value ? r.color + " border-current" : "border-border hover:bg-muted")}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Assign to Shop</label>
            <select value={form.shopId} onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))}
              className="form-input w-full">
              <option value="">No shop (assign later)</option>
              {shops.filter((s: any) => s.status === "ACTIVE").map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Staff Member
          </button>
        </div>
      </div>
    </div>
  );
}
