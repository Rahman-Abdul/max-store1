"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";
import { X, Printer, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props { sale: any; onClose: () => void; }

// Format date/time for receipt
function rDate(d: any) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-NG", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function rTime(d: any) {
  const dt = new Date(d);
  return dt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

// Always resolve a printable customer name — never blank on the receipt
function resolveCustomerName(sale: any): string {
  return (
    sale?.customerName ||
    sale?.customer?.name ||
    sale?.customer_name ||
    "Walk-in Customer"
  );
}

export function ReceiptModal({ sale, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [sendingWA, setSendingWA] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${sale.receiptNo || sale.orderCode}`,
    onAfterPrint: () => toast.success("Receipt printed"),
  });

  const customerName = resolveCustomerName(sale);
  const totalAmount  = Number(sale.totalAmount || 0);
  const amountPaid   = Number(sale.amountPaid   || totalAmount);
  const discount     = Number(sale.discount     || 0);
  const subtotal     = totalAmount + discount;
  const change       = amountPaid - totalAmount;
  const timestamp    = sale.confirmedAt || sale.createdAt || new Date();
  const shopName     = sale.shop?.name  || "EnterprisePOS";
  const shopPhone    = sale.shop?.phone || "";

  const W = 42; // receipt width in chars
  const line  = "─".repeat(W);
  const dline = "━".repeat(W);

  const pad = (left: string, right: string, width: number) => {
    const space = Math.max(1, width - left.length - right.length);
    return left + " ".repeat(space) + right;
  };

  const handleWhatsApp = async () => {
    if (!sale.customer?.phone) { toast.error("No customer phone number"); return; }
    setSendingWA(true);
    const msg = [
      `🧾 *${shopName}*`,
      shopPhone ? `📞 ${shopPhone}` : "",
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      `Receipt: *${sale.receiptNo || sale.orderCode}*`,
      `Date: ${rDate(timestamp)} ${rTime(timestamp)}`,
      `Customer: ${customerName}`,
      ``,
      `*ITEMS:*`,
      ...(sale.items || []).map((i: any) =>
        `• ${i.productName} ×${i.quantity} — *${formatCurrency(i.totalAmount || i.totalCost)}*`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━━`,
      discount > 0 ? `Subtotal: ${formatCurrency(subtotal)}` : "",
      discount > 0 ? `Discount: -${formatCurrency(discount)}` : "",
      `*TOTAL: ${formatCurrency(totalAmount)}*`,
      `Paid (${getPaymentMethodLabel(sale.paymentMethod)}): ${formatCurrency(amountPaid)}`,
      change > 0 ? `Change: ${formatCurrency(change)}` : "",
      ``,
      `Thank you for your patronage! 🙏`,
      `_${shopName}_`,
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sale.customer.phone, message: msg, saleId: sale.id }),
      });
      const data = await res.json();
      if (data.success) toast.success("Receipt sent via WhatsApp ✅");
      else toast.error("Failed to send WhatsApp");
    } catch { toast.error("WhatsApp unavailable"); }
    finally { setSendingWA(false); }
  };

  // Box-drawing receipt style
  const R: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "12px",
    lineHeight: "1.7",
    color: "#000",
    backgroundColor: "#fff",
    padding: "16px 12px",
    whiteSpace: "pre",
    width: "100%",
    overflowX: "auto",
  };

  const top    = `┌${"─".repeat(W)}┐`;
  const mid    = `├${"─".repeat(W)}┤`;
  const bot    = `└${"─".repeat(W)}┘`;
  const row    = (s: string) => `│${s.padEnd(W)}│`;
  const center = (s: string) => {
    const padLeft  = Math.floor((W - s.length) / 2);
    const padRight = W - s.length - padLeft;
    return `│${" ".repeat(padLeft)}${s}${" ".repeat(padRight)}│`;
  };
  const lr     = (l: string, r: string) => {
    const space = Math.max(1, W - l.length - r.length);
    return `│${l}${" ".repeat(space)}${r}│`;
  };

  const lines = [
    top,
    center(shopName.toUpperCase().slice(0, W - 2)),
    mid,
    ...(shopPhone ? [row(` Phone: ${shopPhone}`)] : []),
    row(` Receipt No: ${sale.receiptNo || sale.orderCode}`),
    lr(` Date: ${rDate(timestamp)}`, `Time: ${rTime(timestamp)} `),
    mid,
    ...(sale.cashier?.name  ? [row(` Cashier : ${sale.cashier.name}`)]         : []),
    ...(sale.staff?.name && sale.staff?.name !== sale.cashier?.name ? [row(` Staff   : ${sale.staff.name}`)] : []),
    // Customer name always shown — falls back to "Walk-in Customer"
    row(` Customer: ${customerName}`),
    mid,
    row(` ${"ITEM".padEnd(22)} ${"QTY".padStart(4)} ${"TOTAL".padStart(12)} `),
    mid,
    ...(sale.items || []).map((item: any) => {
      const name  = (item.productName || item.name || "").slice(0, 22).padEnd(22);
      const qty   = String(item.quantity || 1).padStart(4);
      const total = formatCurrency(item.totalAmount || item.totalCost || 0).padStart(12);
      return row(` ${name} ${qty} ${total} `);
    }),
    mid,
    ...(discount > 0 ? [
      lr(` Subtotal:`, `${formatCurrency(subtotal)} `),
      lr(` Discount:`, `-${formatCurrency(discount)} `),
    ] : []),
    mid,
    lr(` TOTAL:`, `${formatCurrency(totalAmount)} `),
    mid,
    lr(` Payment Method: ${getPaymentMethodLabel(sale.paymentMethod)}`, ""),
    lr(` Amount Paid:`, `${formatCurrency(amountPaid)} `),
    ...(change > 0  ? [lr(` Change:`, `${formatCurrency(change)} `)]          : []),
    ...(change < 0  ? [lr(` Balance Due:`, `${formatCurrency(Math.abs(change))} `)] : []),
    mid,
    center("THANK YOU FOR YOUR PURCHASE"),
    center(shopName.slice(0, W - 2)),
    bot,
  ];

  const receiptText = lines.join("\n");

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="font-semibold">Payment Confirmed</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="p-4 overflow-x-auto">
          <div ref={receiptRef} style={R}>{receiptText}</div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={handlePrint}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            <Printer size={15} /> Print
          </button>
          <button onClick={handleWhatsApp} disabled={sendingWA}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            <MessageSquare size={15} />
            {sendingWA ? "Sending..." : "WhatsApp"}
          </button>
          <button onClick={onClose}
            className="px-3 border border-border rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
