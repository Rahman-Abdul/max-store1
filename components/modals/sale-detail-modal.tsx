"use client";

import { formatCurrency, formatDateTime, getPaymentMethodLabel, getBuyerTypeLabel } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface SaleItem {
  id: string; productName: string; productSku: string;
  quantity: number; sellingPrice: number; costPrice: number;
  totalAmount: number; profit: number;
}

interface Sale {
  id: string; orderCode: string; status: string; buyerType: string;
  totalAmount: number; totalCost: number; totalProfit: number;
  discount: number; paymentMethod: string; notes?: string | null;
  createdAt: Date;
  staff: { name: string };
  cashier?: { name: string } | null;
  customer?: { name: string; phone?: string | null } | null;
  shop: { name: string };
  items: SaleItem[];
  receipt?: { receiptNo: string } | null;
}

interface Props {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailModal({ sale, open, onOpenChange }: Props) {
  if (!sale) return null;

  const sendWhatsApp = async () => {
    if (!sale.customer?.phone) { toast.error("Customer has no phone number"); return; }
    const msg = `Receipt for Order ${sale.orderCode}\nShop: ${sale.shop.name}\nTotal: ${formatCurrency(sale.totalAmount)}\nPayment: ${getPaymentMethodLabel(sale.paymentMethod)}\nDate: ${formatDateTime(sale.createdAt)}\nThank you!`;
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sale.customer.phone, message: msg, saleId: sale.id }),
      });
      const data = await res.json();
      if (data.success) toast.success("Receipt sent via WhatsApp");
      else toast.error("Failed to send WhatsApp message");
    } catch { toast.error("Something went wrong"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order {sale.orderCode}</span>
            <Badge className={sale.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
              {sale.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { l: "Shop", v: sale.shop.name },
              { l: "Staff", v: sale.staff.name },
              { l: "Cashier", v: sale.cashier?.name || "—" },
              { l: "Customer", v: sale.customer?.name || "Walk-in" },
              { l: "Buyer Type", v: getBuyerTypeLabel(sale.buyerType) },
              { l: "Payment", v: getPaymentMethodLabel(sale.paymentMethod) },
              { l: "Date", v: formatDateTime(sale.createdAt) },
              { l: "Receipt", v: sale.receipt?.receiptNo || "—" },
            ].map(({ l, v }) => (
              <div key={l}>
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2">Item</th>
                  <th className="text-right px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Price</th>
                  <th className="text-right px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sale.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.productSku}</p>
                    </td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.sellingPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-sm border-t border-border pt-3">
            {sale.discount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Discount</span><span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <span>Total</span><span>{formatCurrency(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 text-xs">
              <span>Profit</span><span>{formatCurrency(sale.totalProfit)}</span>
            </div>
          </div>

          {sale.notes && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p>{sale.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />Print Receipt
            </Button>
            {sale.customer?.phone && (
              <Button variant="outline" className="flex-1" onClick={sendWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
