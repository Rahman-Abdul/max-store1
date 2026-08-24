import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { formatCurrency, formatDateTime, formatDate, serializeData, cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Package, TrendingUp, RotateCcw, AlertTriangle,
  Truck, BarChart3, Clock, ArrowUp, ArrowDown, Minus
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session!.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  // Next.js 15: params must be awaited
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      shop: true,
      saleItems: {
        include: {
          sale: {
            select: {
              id: true, orderCode: true, createdAt: true,
              buyerType: true, status: true,
              staff: { select: { name: true } },
            },
          },
        },
        orderBy: { sale: { createdAt: "desc" } },
        take: 15,
      },
      inventoryLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      damagedProducts: {
        include: { reportedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      restockHistory: {
        orderBy: { restockedAt: "desc" },
        take: 10,
      },
      returnItems: {
        include: { return: { select: { id: true, createdAt: true, status: true } } },
        take: 10,
      },
    },
  });

  if (!product) notFound();

  // Serialize Decimal fields before passing to JSX
  const p = serializeData(product);

  const totalSold = p.saleItems.reduce((s: number, i: any) => s + i.quantity, 0);
  const totalRevenue = p.saleItems
    .filter((i: any) => i.sale.status === "COMPLETED")
    .reduce((s: number, i: any) => s + i.totalAmount, 0);
  const totalProfit = p.saleItems
    .filter((i: any) => i.sale.status === "COMPLETED")
    .reduce((s: number, i: any) => s + i.profit, 0);
  const totalDamaged = p.damagedProducts.reduce((s: number, d: any) => s + d.quantity, 0);
  const totalReturned = p.returnItems.reduce((s: number, r: any) => s + r.quantity, 0);
  const isLowStock = p.stockQuantity <= p.lowStockThreshold;
  const isOutOfStock = p.stockQuantity === 0;

  const logTypeIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      SALE: <ArrowDown size={14} className="text-red-500" />,
      RESTOCK: <ArrowUp size={14} className="text-green-500" />,
      RETURN: <RotateCcw size={14} className="text-blue-500" />,
      DAMAGE: <AlertTriangle size={14} className="text-amber-500" />,
      INITIAL: <Package size={14} className="text-muted-foreground" />,
      ADJUSTMENT: <Minus size={14} className="text-muted-foreground" />,
    };
    return map[type] || <Minus size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back + header */}
      <div>
        <Link href="/dashboard/inventory" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Inventory
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
            {p.image ? (
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={28} className="text-muted-foreground/40" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{p.name}</h1>
              <span className={cn(
                "text-xs px-2.5 py-1 rounded-full font-semibold",
                isOutOfStock ? "badge-danger" : isLowStock ? "badge-warning" : "badge-success"
              )}>
                {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="font-mono">SKU: {p.sku}</span>
              {p.barcode && <span className="font-mono">Barcode: {p.barcode}</span>}
              <span>{p.category?.name || "Uncategorized"}</span>
              <span>{p.shop.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Current Stock", value: p.stockQuantity, sub: `Threshold: ${p.lowStockThreshold}`, color: isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-foreground" },
          { label: "Cost Price", value: formatCurrency(Number(p.costPrice)), sub: "Per unit", color: "text-foreground" },
          { label: "Total Sold", value: totalSold, sub: `${p.saleItems.length} transactions`, color: "text-blue-600" },
          { label: "Total Profit", value: formatCurrency(totalProfit), sub: `Revenue: ${formatCurrency(totalRevenue)}`, color: totalProfit >= 0 ? "text-emerald-600" : "text-red-600" },
        ].map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
            <p className={cn("text-2xl font-bold", m.color)}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product info */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package size={16} className="text-muted-foreground" /> Product Details
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Name", value: p.name },
                { label: "SKU", value: p.sku, mono: true },
                { label: "Barcode", value: p.barcode || "—", mono: !!p.barcode },
                { label: "Category", value: p.category?.name || "—" },
                { label: "Cost Price", value: formatCurrency(Number(p.costPrice)) },
                { label: "Shop", value: p.shop.name },
                { label: "Status", value: p.isActive ? "Active" : "Inactive" },
                { label: "Added", value: formatDate(p.createdAt) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("font-medium text-right", row.mono && "font-mono text-xs")}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {p.supplier && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Truck size={16} className="text-muted-foreground" /> Supplier
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">{p.supplier.name}</p>
                {p.supplier.contactName && <p className="text-muted-foreground">{p.supplier.contactName}</p>}
                {p.supplier.phone && <p className="text-muted-foreground">📞 {p.supplier.phone}</p>}
                {p.supplier.email && <p className="text-muted-foreground">📧 {p.supplier.email}</p>}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-muted-foreground" /> Loss Summary
            </h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Damaged Units", value: totalDamaged, color: "text-red-600" },
                { label: "Returned Units", value: totalReturned, color: "text-amber-600" },
                { label: "Cost Loss", value: formatCurrency(p.damagedProducts.reduce((s: number, d: any) => s + d.costLoss, 0)), color: "text-red-600" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={cn("font-semibold", row.color)}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <BarChart3 size={16} className="text-muted-foreground" />
              <h3 className="font-semibold">Recent Sales ({p.saleItems.length})</h3>
            </div>
            <div className="divide-y divide-border">
              {p.saleItems.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No sales recorded</p>
              ) : (
                p.saleItems.slice(0, 10).map((item: any) => (
                  <Link key={item.id} href={`/dashboard/sales`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-mono font-semibold text-primary">{item.sale.orderCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.sale.createdAt)} · {item.sale.staff.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">×{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.sellingPrice)} each</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold">{formatCurrency(item.totalAmount)}</p>
                      <p className={cn("text-xs", item.profit >= 0 ? "text-emerald-600" : "text-red-500")}>
                        {item.profit >= 0 ? "+" : ""}{formatCurrency(item.profit)}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <h3 className="font-semibold">Inventory Movement Log</h3>
            </div>
            <div className="divide-y divide-border">
              {p.inventoryLogs.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No movements recorded</p>
              ) : (
                p.inventoryLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {logTypeIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}{log.user && ` · ${log.user.name}`}
                      </p>
                      {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn("text-sm font-bold", log.quantityChange > 0 ? "text-green-600" : "text-red-500")}>
                        {log.quantityChange > 0 ? "+" : ""}{log.quantityChange}
                      </p>
                      <p className="text-xs text-muted-foreground">→ {log.quantityAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {p.restockHistory.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <ArrowUp size={16} className="text-muted-foreground" />
                <h3 className="font-semibold">Restock History</h3>
              </div>
              <div className="divide-y divide-border">
                {p.restockHistory.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">+{r.quantity} units</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.restockedAt)}</p>
                      {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
                    </div>
                    {r.costPrice && <p className="text-sm text-muted-foreground">{formatCurrency(r.costPrice)} each</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
