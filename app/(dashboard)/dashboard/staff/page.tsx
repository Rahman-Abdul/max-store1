"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Shield,
  Lock,
  UserX,
  UserCheck,
  X,
  ShoppingCart,
  ChevronRight,
  Trash2,
} from "lucide-react";

import { ResetPasswordModal } from "@/components/forms/reset-password-modal";

const roleColor: Record<string, string> = {
  ROOT_SUPER_ADMIN: "bg-purple-100 text-purple-700",
  SHOP_ADMIN: "bg-blue-100 text-blue-700",
  STAFF: "bg-green-100 text-green-700",
  CASHIER: "bg-amber-100 text-amber-700",
};

const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
  INACTIVE: "bg-gray-100 text-gray-700",
};

// Local utility functions
const formatDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", {
        dateStyle: "medium",
      })
    : "—";

const formatCurrency = (v: any) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(Number(v) || 0);

export default function StaffPage() {
  const { data: session } = useSession();

  const user = session?.user as any;

  const isRSA = user?.role === "ROOT_SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showReset, setShowReset] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["staff", search],
    queryFn: async () => {
      const params = new URLSearchParams({ search });

      const res = await fetch(`/api/staff?${params}`);

      return res.json();
    },
  });

  const staff = data?.data || [];

  // Staff sales history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["staff-history", selected?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/sales?staffId=${selected.id}&limit=20`
      );

      return res.json();
    },
    enabled: !!selected,
  });

  const history = historyData?.data || [];

  const handleToggleStatus = async (member: any) => {
    const newStatus =
      member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Status updated");
        refetch();
      } else {
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDeleteStaff = async (member: any) => {
    const confirmed = confirm(
      `Delete "${member.name}"? Their sales history will be preserved but they will lose access.`
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${member.name} removed`);

        refetch();

        if (selected?.id === member.id) {
          setSelected(null);
        }
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const filtered = staff.filter((s: any) => {
    return (
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.username?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>

          <p className="page-subtitle">
            {staff.length} team members
          </p>
        </div>

        {isRSA && (
          <button
            onClick={() =>
              toast.info(
                "Use Settings > Create User to add staff"
              )
            }
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff..."
          className="form-input pl-9 w-full"
        />
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member: any) => (
          <div
            key={member.id}
            onClick={() => setSelected(member)}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
          >
            {/* Top */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {getInitials(member.name)}
                </div>

                <div>
                  <p className="font-semibold text-sm">
                    {member.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    @{member.username}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {isRSA && member.id !== user.id && (
                  <>
                    {/* Reset Password */}
                    <button
                      onClick={() => setShowReset(member)}
                      title="Reset password"
                      className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </button>

                    {/* Toggle Status */}
                    <button
                      onClick={() =>
                        handleToggleStatus(member)
                      }
                      title={
                        member.status === "ACTIVE"
                          ? "Suspend"
                          : "Activate"
                      }
                      className={cn(
                        "p-1.5 hover:bg-muted rounded-lg transition-colors",
                        member.status === "ACTIVE"
                          ? "text-amber-500 hover:text-amber-600"
                          : "text-green-500 hover:text-green-600"
                      )}
                    >
                      {member.status === "ACTIVE" ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Delete */}
                    {member.status !== "INACTIVE" && (
                      <button
                        onClick={() =>
                          handleDeleteStaff(member)
                        }
                        title="Delete staff member"
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}

                <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span
                className={cn(
                  "badge text-xs",
                  roleColor[member.role] ||
                    "bg-muted text-muted-foreground"
                )}
              >
                {member.role?.replace(/_/g, " ")}
              </span>

              <span
                className={cn(
                  "badge text-xs",
                  statusColor[member.status] ||
                    "bg-muted text-muted-foreground"
                )}
              >
                {member.status}
              </span>
            </div>

            {/* Details */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{member.email}</p>

              {member.phone && <p>{member.phone}</p>}

              {member.shopAssignments?.length > 0 && (
                <p className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />

                  {member.shopAssignments
                    .map((s: any) => s.shop?.name)
                    .join(", ")}
                </p>
              )}

              <p>
                Last login:{" "}
                {member.lastLoginAt
                  ? formatDate(member.lastLoginAt)
                  : "Never"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {getInitials(selected.name)}
                </div>

                <div>
                  <h2 className="font-bold text-lg">
                    {selected.name}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    @{selected.username} · {selected.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Staff Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  {
                    l: "Role",
                    v: selected.role?.replace(/_/g, " "),
                  },
                  {
                    l: "Status",
                    v: selected.status,
                  },
                  {
                    l: "Phone",
                    v: selected.phone || "—",
                  },
                  {
                    l: "Joined",
                    v: formatDate(selected.createdAt),
                  },
                  {
                    l: "Last Login",
                    v: selected.lastLoginAt
                      ? formatDate(selected.lastLoginAt)
                      : "Never",
                  },
                  {
                    l: "Shop(s)",
                    v:
                      selected.shopAssignments
                        ?.map((s: any) => s.shop?.name)
                        .join(", ") || "—",
                  },
                ].map(({ l, v }) => (
                  <div
                    key={l}
                    className="bg-muted/50 rounded-lg p-3"
                  >
                    <p className="text-xs text-muted-foreground">
                      {l}
                    </p>

                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>

              {/* Sales History */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Recent Sales
                </h3>

                {historyLoading ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No sales recorded
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Profit</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {history.map((s: any) => (
                          <tr key={s.id}>
                            <td>
                              <span className="font-mono font-bold text-primary tracking-wider">
                                {s.orderCode}
                              </span>
                            </td>

                            <td className="text-xs text-muted-foreground">
                              {new Date(
                                s.createdAt
                              ).toLocaleDateString()}
                            </td>

                            <td className="font-medium">
                              {formatCurrency(s.totalAmount)}
                            </td>

                            <td
                              className={cn(
                                "font-medium text-sm",
                                Number(s.totalProfit) >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              )}
                            >
                              {formatCurrency(s.totalProfit)}
                            </td>

                            <td>
                              <span
                                className={cn(
                                  "badge text-xs",
                                  s.status === "COMPLETED"
                                    ? "badge-success"
                                    : s.status === "PENDING"
                                    ? "badge-warning"
                                    : "badge-neutral"
                                )}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && (
        <ResetPasswordModal
          user={showReset}
          open={!!showReset}
          onOpenChange={() => setShowReset(null)}
          onSuccess={() => {
            setShowReset(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
