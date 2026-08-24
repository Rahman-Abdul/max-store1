import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const period = searchParams.get("period") || "30d";

  const user = session.user as any;
  let effectiveShopId = shopId;
  if (user.role === "SHOP_ADMIN" || user.role === "STAFF") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    effectiveShopId = us?.shopId || null;
  }

  const days = period === "7d" ? 7 : period === "12m" ? 365 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = { createdAt: { gte: startDate }, status: { in: ["COMPLETED", "CONFIRMED"] } };
  if (effectiveShopId) where.shopId = effectiveShopId;

  const [sales, expenses, topProducts] = await Promise.all([
    prisma.sale.findMany({
      where,
      select: { totalAmount: true, totalProfit: true, totalCost: true, createdAt: true, buyerType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: startDate }, ...(effectiveShopId ? { shopId: effectiveShopId } : {}), status: "APPROVED" },
      select: { amount: true, createdAt: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "productName"],
      where: { sale: where },
      _sum: { quantity: true, totalAmount: true, profit: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    }),
  ]);

  // Build trend data grouped by day
  const trendMap = new Map<string, { revenue: number; profit: number; sales: number }>();
  for (const sale of sales) {
    const day = sale.createdAt.toISOString().slice(0, 10);
    const existing = trendMap.get(day) || { revenue: 0, profit: 0, sales: 0 };
    trendMap.set(day, {
      revenue: existing.revenue + Number(sale.totalAmount),
      profit: existing.profit + Number(sale.totalProfit),
      sales: existing.sales + 1,
    });
  }

  const trend = Array.from(trendMap.entries()).map(([period, data]) => ({ period, ...data }));

  const byBuyerType = sales.reduce((acc, s) => {
    acc[s.buyerType] = (acc[s.buyerType] || 0) + Number(s.totalAmount);
    return acc;
  }, {} as Record<string, number>);

  const totalRevenue = sales.reduce((s, r) => s + Number(r.totalAmount), 0);
  const totalProfit = sales.reduce((s, r) => s + Number(r.totalProfit), 0);
  const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);

  return NextResponse.json({
    success: true,
    data: {
      summary: { totalRevenue, totalProfit, totalExpenses, netProfit: totalProfit - totalExpenses, totalSales: sales.length },
      trend,
      byBuyerType,
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        totalSold: p._sum.quantity || 0,
        totalRevenue: Number(p._sum.totalAmount || 0),
        totalProfit: Number(p._sum.profit || 0),
      })),
    },
  });
}
