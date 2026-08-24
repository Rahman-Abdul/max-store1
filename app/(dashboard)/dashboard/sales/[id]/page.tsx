import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDateTime, getBuyerTypeLabel, getPaymentMethodLabel, cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Package, User, Store, CreditCard, Receipt,
  RotateCcw, TrendingUp, Clock, CheckCircle2, AlertCircle
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session!.user as any;
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, name: true, email: true, username: true } },
      cashier: { select: { id: true, name: true, email: true } },
      customer: true,
      shop: true,
      items: { include: { product: { include: { category: true } } } },
      payments: true,
      receipt: true,
      refunds: { include: { requestedBy: { select: { name: true } } } },
      returns: { include: { items: { include: { product: true } } } },
    },
  });

  if (!sale) notFound();

  // Role-based access: staff can only see their own sales
  if (user.role === "STAFF" && sale.staffId !== user.id) notFound();

  const totalCost = sale.items.reduce((sum, i) => sum + Number(i.totalCost), 0);
  const totalRevenue = Number(sale.totalAmount);
  const totalProfit = Number(sale.totalProfit);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    REFUNDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    PARTIAL_REFUND: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/sales" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Sales
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-title font-mono">{sale.orderCode}</h1>
            <p className="page-subtitle">{formatDateTime(sale.createdAt)}</p>
          </div>
          <span className={cn("px-3 py-1.5 rounded-full text-sm font-semibold", statusColors[sale.status] || "")}>
            {sale.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Staff", value: sale.staff.name, icon: User },
          { label: "Cashier", value: sale.cashier?.name || "Pending", icon: User },
          { label: "Shop", value: sale.shop.name, icon: Store },
          { label: "Buyer Type", value: getBuyerTypeLabel(sale.buyerType), icon: User },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <item.icon size={14} />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
            <p className="font-semibold text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-xl font-bold font-display">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
          <p className="text-xl font-bold font-display text-muted-foreground">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Profit</p>
          <p className={cn("text-xl font-bold font-display", totalProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
          <p className={cn("text-xl font-bold font-display", profitMargin >= 0 ? "text-emerald-600" : "text-red-500")}>
            {profitMargin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Package size={16} className="text-muted-foreground" />
            <h3 className="font-semibold">Items Sold</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">Product</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Cost</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Selling</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sale.items.map((item) => {
                const itemProfit = Number(item.profit);
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/inventory/${item.productId}`} className="hover:text-primary transition-colors">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.productSku}</p>
                        {item.product?.category && (
                          <p className="text-xs text-muted-foreground">{item.product.category.name}</p>
                        )}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{formatCurrency(Number(item.costPrice))}</td>
                    <td className="px-3 py-3 text-right font-medium">{formatCurrency(Number(item.sellingPrice))}</td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-semibold">{formatCurrency(Number(item.totalAmount))}</p>
                      <p className={cn("text-xs", itemProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {itemProfit >= 0 ? "+" : ""}{formatCurrency(itemProfit)}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {Number(sale.discount) > 0 && (
                <tr className="border-t border-border">
                  <td colSpan={4} className="px-5 py-2 text-right text-sm text-muted-foreground">Discount</td>
                  <td className="px-5 py-2 text-right text-sm text-red-500">-{formatCurrency(Number(sale.discount))}</td>
                </tr>
              )}
              <tr className="border-t border-border bg-muted/30">
                <td colSpan={4} className="px-5 py-3 text-right font-bold">Total</td>
                <td className="px-5 py-3 text-right font-bold text-lg">{formatCurrency(Number(sale.totalAmount))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          {/* Payment info */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
              <CreditCard size={15} className="text-muted-foreground" />
              <h3 className="font-semibold text-sm">Payment</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{getPaymentMethodLabel(sale.paymentMethod)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  sale.paymentStatus === "COMPLETED" ? "badge-success" :
                    sale.paymentStatus === "PARTIAL" ? "badge-warning" : "badge-danger"
                )}>
                  {sale.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-semibold">{formatCurrency(Number(sale.amountPaid))}</span>
              </div>
              {Number(sale.balanceDue) > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Balance Due</span>
                  <span className="font-semibold">{formatCurrency(Number(sale.balanceDue))}</span>
                </div>
              )}
              {sale.receipt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt No.</span>
                  <span className="font-mono text-xs font-semibold">{sale.receipt.receiptNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          {sale.customer && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <User size={15} className="text-muted-foreground" />
                <h3 className="font-semibold text-sm">Customer</h3>
              </div>
              <div className="px-5 py-4 space-y-2 text-sm">
                <Link href={`/dashboard/customers/${sale.customer.id}`} className="font-semibold hover:text-primary transition-colors">
                  {sale.customer.name}
                </Link>
                {sale.customer.phone && <p className="text-muted-foreground">{sale.customer.phone}</p>}
                {sale.customer.email && <p className="text-muted-foreground">{sale.customer.email}</p>}
              </div>
            </div>
          )}

          {/* Refunds */}
          {sale.refunds.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                <RotateCcw size={15} className="text-muted-foreground" />
                <h3 className="font-semibold text-sm">Refunds ({sale.refunds.length})</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                {sale.refunds.map((refund) => (
                  <div key={refund.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{formatCurrency(Number(refund.amount))}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        refund.status === "COMPLETED" ? "badge-success" :
                          refund.status === "APPROVED" ? "badge-info" :
                            refund.status === "REJECTED" ? "badge-danger" : "badge-warning"
                      )}>
                        {refund.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{refund.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              <h3 className="font-semibold text-sm">Timeline</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Package size={12} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Order Created</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">by {sale.staff.name}</p>
                </div>
              </div>
              {sale.confirmedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={12} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Confirmed</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(sale.confirmedAt)}</p>
                    {sale.cashier && <p className="text-xs text-muted-foreground">by {sale.cashier.name}</p>}
                  </div>
                </div>
              )}
              {sale.status === "CANCELLED" && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={12} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">Order Cancelled</p>
                    {sale.notes && <p className="text-xs text-muted-foreground">{sale.notes}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
