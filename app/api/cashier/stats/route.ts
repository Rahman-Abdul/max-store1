import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Resolve shopId for scoped roles
  let shopId: string | undefined;
  if (user.role === "CASHIER" || user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) shopId = us.shopId;
  }

  const baseWhere = {
    ...(shopId ? { shopId } : {}),
    confirmedAt: { gte: dayStart, lte: dayEnd },
  };

  // Today's completed sales
  const completedSales = await prisma.sale.findMany({
    where: { ...baseWhere, status: "COMPLETED" },
    include: {
      items: { include: { product: { select: { costPrice: true } } } },
    },
  });

  const todayRevenue = completedSales.reduce(
    (sum, s) => sum + Number(s.totalAmount),
    0
  );

  const todayProfit = completedSales.reduce((sum, s) => {
    const revenue = Number(s.totalAmount);
    const cost = s.items.reduce(
      (c, item) => c + Number(item.product?.costPrice ?? 0) * item.quantity,
      0
    );
    return sum + (revenue - cost);
  }, 0);

  const todayTransactions = completedSales.length;

  // Pending orders (not time-scoped — all open orders)
  const pendingCount = await prisma.sale.count({
    where: {
      ...(shopId ? { shopId } : {}),
      status: "PENDING",
    },
  });

  // Pending refunds / cancellation requests
  const pendingRefunds = await prisma.sale.count({
    where: {
      ...(shopId ? { shopId } : {}),
      status: "CANCELLED",
      confirmedAt: null, // cancelled but not yet processed/refunded
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      todayRevenue,
      todayProfit,
      todayTransactions,
      pendingOrders: pendingCount,
      pendingRefunds,
    },
  });
}
