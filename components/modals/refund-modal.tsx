"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface Props {
  saleId: string;
  maxAmount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RefundModal({ saleId, maxAmount, open, onOpenChange, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error("Enter a valid amount"); return; }
    if (num > maxAmount) { toast.error(`Max refund is ${formatCurrency(maxAmount)}`); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId, amount: num, reason, refundMethod: method }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Refund request submitted");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to submit refund");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Request Refund</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Maximum refundable amount</p>
            <p className="text-xl font-bold">{formatCurrency(maxAmount)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <Input type="number" min="0" max={maxAmount} value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="Enter refund amount" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for refund" />
          </div>
          <div className="space-y-1.5">
            <Label>Refund Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="WALLET">Wallet Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
