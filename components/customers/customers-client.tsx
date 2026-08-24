"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate, getInitials, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Plus, User, Phone, Mail, CreditCard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Customer {
  id: string; name: string; email?: string | null; phone?: string | null;
  address?: string | null; debtBalance: number; totalPurchases: number;
  loyaltyPoints: number; createdAt: Date;
  debts?: Array<{ id: string; balance: number; sale: { orderCode: string } }>;
}

interface Props {
  customers: Customer[];
  shopId: string;
  canEdit: boolean;
}

export function CustomersClient({ customers: initial, shopId, canEdit }: Props) {
  const [customers, setCustomers] = useState(initial);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    startTransition(async () => {
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, shopId }),
        });
        const data = await res.json();
        if (data.success) {
          setCustomers(prev => [data.data, ...prev]);
          setShowAdd(false);
          setForm({ name: "", phone: "", email: "", address: "" });
          toast.success("Customer created");
        } else {
          toast.error(data.error || "Failed to create customer");
        }
      } catch { toast.error("Something went wrong"); }
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} registered customers</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..." className="pl-9" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th><th>Contact</th><th>Total Purchases</th>
              <th>Debt Balance</th><th>Loyalty Points</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {getInitials(c.name)}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </td>
                <td>
                  <div className="space-y-0.5">
                    {c.phone && <p className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{c.phone}</p>}
                    {c.email && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</p>}
                  </div>
                </td>
                <td className="font-medium">{formatCurrency(c.totalPurchases)}</td>
                <td>
                  {Number(c.debtBalance) > 0 ? (
                    <Badge variant="destructive">{formatCurrency(c.debtBalance)}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">Clear</Badge>
                  )}
                </td>
                <td>{c.loyaltyPoints} pts</td>
                <td>{formatDate(c.createdAt)}</td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(c)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {["name", "phone", "email", "address"].map(field => (
              <div key={field} className="space-y-1.5">
                <Label className="capitalize">{field}{field === "name" && " *"}</Label>
                <Input value={(form as any)[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={`Enter ${field}`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selected.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Customer since {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Purchases", value: formatCurrency(selected.totalPurchases), color: "" },
                  { label: "Debt Balance", value: formatCurrency(selected.debtBalance), color: Number(selected.debtBalance) > 0 ? "text-red-600" : "text-emerald-600" },
                  { label: "Loyalty Points", value: `${selected.loyaltyPoints} pts`, color: "" },
                ].map(stat => (
                  <div key={stat.label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className={cn("font-semibold", stat.color)}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {selected.debts && selected.debts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" /> Outstanding Debts
                  </p>
                  <div className="space-y-2">
                    {selected.debts.map(d => (
                      <div key={d.id} className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground">{d.sale.orderCode}</span>
                        <span className="text-red-600 font-medium">{formatCurrency(d.balance)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
