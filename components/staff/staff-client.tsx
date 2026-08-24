"use client";

import { useState, useTransition } from "react";
import { formatDate, getInitials, getRoleColor, getStatusColor, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Plus, Shield, MoreVertical, Lock, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface StaffMember {
  id: string; name: string; email: string; username: string;
  role: string; status: string; phone?: string | null;
  lastLoginAt?: Date | null; createdAt: Date;
  shopAssignments: Array<{ shop: { id: string; name: string } }>;
}

interface Props {
  staff: StaffMember[];
  currentUser: any;
  shops: Array<{ id: string; name: string }>;
}

export function StaffClient({ staff: initial, currentUser, shops }: Props) {
  const [staff, setStaff] = useState(initial);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const isRSA = currentUser.role === "ROOT_SUPER_ADMIN";

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusToggle = (memberId: string, currentStatus: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/staff/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }),
        });
        const data = await res.json();
        if (data.success) {
          setStaff(prev => prev.map(s => s.id === memberId ? { ...s, status: data.data.status } : s));
          toast.success("Status updated");
        } else {
          toast.error(data.error || "Failed to update");
        }
      } catch { toast.error("Something went wrong"); }
    });
  };

  const handleResetPassword = async (memberId: string, name: string) => {
    startTransition(async () => {
      try {
        const newPassword = `Temp@${Math.random().toString(36).slice(2, 8)}`;
        const res = await fetch(`/api/staff/${memberId}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Password reset for ${name}. New password: ${newPassword}`, { duration: 10000 });
        } else {
          toast.error(data.error || "Failed to reset password");
        }
      } catch { toast.error("Something went wrong"); }
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{staff.length} team members</p>
        </div>
        {isRSA && (
          <Button onClick={() => toast.info("Use Settings > Create User to add staff")}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search staff..." className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(member => (
          <div key={member.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {getInitials(member.name)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{member.name}</p>
                  <p className="text-xs text-muted-foreground">@{member.username}</p>
                </div>
              </div>
              {isRSA && member.id !== currentUser.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusToggle(member.id, member.status)}>
                      {member.status === "ACTIVE"
                        ? <><UserX className="h-4 w-4 mr-2 text-red-500" />Suspend</>
                        : <><UserCheck className="h-4 w-4 mr-2 text-emerald-500" />Activate</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleResetPassword(member.id, member.name)}>
                      <Lock className="h-4 w-4 mr-2" />Reset Password
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge className={cn("text-xs", getRoleColor(member.role))}>{member.role.replace(/_/g, " ")}</Badge>
              <Badge className={cn("text-xs", getStatusColor(member.status))}>{member.status}</Badge>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{member.email}</p>
              {member.phone && <p>{member.phone}</p>}
              {member.shopAssignments.length > 0 && (
                <p className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {member.shopAssignments.map(s => s.shop.name).join(", ")}
                </p>
              )}
              <p>Last login: {member.lastLoginAt ? formatDate(member.lastLoginAt) : "Never"}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No staff members found</p>
        </div>
      )}
    </div>
  );
}
