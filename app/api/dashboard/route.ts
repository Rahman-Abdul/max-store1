import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  const user = session.user as any;
  let effectiveShopId = shopId;
  if (["SHOP_ADMIN", "STAFF", "CASHIER"].includes(user.role)) {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    effectiveShopId = us?.shopId || null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const saleWhere: any = { status: { in: ["COMPLETED", "CONFIRMED"] } };
  if (effectiveShopId) saleWhere.shopId = effectiveShopId;

  const [
    todaySales, monthSales, totalProducts, lowStockCount,
    totalCustomers, pendingRefunds, totalDebts,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { ...saleWhere, createdAt: { gte: todayStart } }, _count: true, _sum: { totalAmount: true, totalProfit: true } }),
    prisma.sale.aggregate({ where: { ...saleWhere, createdAt: { gte: monthStart } }, _count: true, _sum: { totalAmount: true, totalProfit: true } }),
    prisma.product.count({ where: effectiveShopId ? { shopId: effectiveShopId } : {} }),
    prisma.product.count({ where: { ...(effectiveShopId ? { shopId: effectiveShopId } : {}), stockQuantity: { lte: prisma.product.fields.lowStockThreshold } } }),
    prisma.customer.count({ where: effectiveShopId ? { shopId: effectiveShopId } : {} }),
    prisma.refund.count({ where: { status: "PENDING", ...(effectiveShopId ? { sale: { shopId: effectiveShopId } } : {}) } }),
    prisma.debt.aggregate({ where: { balance: { gt: 0 }, ...(effectiveShopId ? { sale: { shopId: effectiveShopId } } : {}) }, _sum: { balance: true } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      today: { sales: todaySales._count, revenue: Number(todaySales._sum.totalAmount || 0), profit: Number(todaySales._sum.totalProfit || 0) },
      month: { sales: monthSales._count, revenue: Number(monthSales._sum.totalAmount || 0), profit: Number(monthSales._sum.totalProfit || 0) },
      totalProducts,
      lowStockCount,
      totalCustomers,
      pendingRefunds,
      totalDebts: Number(totalDebts._sum.balance || 0),
    },
  });
}
