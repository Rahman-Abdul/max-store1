import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const type = searchParams.get("type") || "sales"; // sales | inventory | staff
  const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : new Date(Date.now() - 30 * 86400000);
  const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : new Date();

  const user = session.user as any;
  let effectiveShopId = shopId;
  if (["SHOP_ADMIN", "STAFF"].includes(user.role)) {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    effectiveShopId = us?.shopId || null;
  }

  const saleWhere: any = { createdAt: { gte: startDate, lte: endDate }, status: { in: ["COMPLETED", "CONFIRMED"] } };
  if (effectiveShopId) saleWhere.shopId = effectiveShopId;

  if (type === "sales") {
    const sales = await prisma.sale.findMany({
      where: saleWhere,
      include: { items: true, staff: { select: { name: true } }, shop: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Group by date
    const byDate = new Map<string, { date: string; totalSales: number; totalRevenue: number; totalCost: number; totalProfit: number }>();
    for (const sale of sales) {
      const date = sale.createdAt.toISOString().slice(0, 10);
      const ex = byDate.get(date) || { date, totalSales: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
      byDate.set(date, {
        date,
        totalSales: ex.totalSales + 1,
        totalRevenue: ex.totalRevenue + Number(sale.totalAmount),
        totalCost: ex.totalCost + Number(sale.totalCost),
        totalProfit: ex.totalProfit + Number(sale.totalProfit),
      });
    }
    const arr = Array.from(byDate.values());
    const summary = {
      totalRevenue: arr.reduce((s,r) => s + r.totalRevenue, 0),
      totalProfit:  arr.reduce((s,r) => s + r.totalProfit,  0),
      totalSales:   arr.reduce((s,r) => s + r.totalSales,   0),
      totalCost:    arr.reduce((s,r) => s + r.totalCost,    0),
    };
    return NextResponse.json({ success: true, data: arr, summary });
  }

  if (type === "staff") {
    const staffStats = await prisma.sale.groupBy({
      by: ["staffId"],
      where: saleWhere,
      _count: true,
      _sum: { totalAmount: true, totalProfit: true },
    });

    const staffDetails = await prisma.user.findMany({
      where: { id: { in: staffStats.map((s) => s.staffId) } },
      select: { id: true, name: true },
    });

    const data = staffStats.map((s) => {
      const staff = staffDetails.find((u) => u.id === s.staffId);
      return {
        staffId: s.staffId,
        staffName: staff?.name || "Unknown",
        totalSales: s._count,
        totalRevenue: Number(s._sum.totalAmount || 0),
        totalProfit: Number(s._sum.totalProfit || 0),
        averageOrderValue: s._count > 0 ? Number(s._sum.totalAmount || 0) / s._count : 0,
      };
    });
    return NextResponse.json({ success: true, data });
  }

  // inventory type
  const products = await prisma.product.findMany({
    where: effectiveShopId ? { shopId: effectiveShopId } : {},
    include: {
      inventoryLogs: { where: { createdAt: { gte: startDate, lte: endDate } } },
    },
  });

  const data = products.map((p) => {
    const sold = p.inventoryLogs.filter((l) => l.type === "SALE").reduce((s, l) => s + Math.abs(l.quantityChange), 0);
    const restocked = p.inventoryLogs.filter((l) => l.type === "RESTOCK").reduce((s, l) => s + l.quantityChange, 0);
    const damaged = p.inventoryLogs.filter((l) => l.type === "DAMAGE").reduce((s, l) => s + Math.abs(l.quantityChange), 0);
    return { productId: p.id, productName: p.name, closingStock: p.stockQuantity, sold, restocked, damaged };
  });

  return NextResponse.json({ success: true, data });
}
