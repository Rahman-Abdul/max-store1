import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let shopId: string;
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (!userShop) return NextResponse.json({ error: "No shop assigned" }, { status: 400 });
    shopId = userShop.shopId;
  } else {
    // For super admin, use first active shop or body param
    const shop = await prisma.shop.findFirst({ where: { status: "ACTIVE" } });
    if (!shop) return NextResponse.json({ error: "No active shops" }, { status: 400 });
    shopId = shop.id;
  }

  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  // Gather all data for today
  const [sales, expenses, refunds, damagedProducts] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        status: "COMPLETED",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.expense.findMany({
      where: {
        shopId,
        status: "APPROVED",
        expenseDate: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.refund.findMany({
      where: {
        status: "COMPLETED",
        sale: { shopId },
        completedAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.damagedProduct.findMany({
      where: {
        shopId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    }),
  ]);

  const totalSales = sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
  const totalProfit = sales.reduce((s, sale) => s + Number(sale.totalProfit), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalRefunds = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const totalDamages = damagedProducts.reduce((s, d) => s + Number(d.costLoss), 0);

  try {
    const report = await prisma.closingReport.upsert({
      where: {
        shopId_reportDate: {
          shopId,
          reportDate: dayStart,
        },
      },
      update: {
        totalSales,
        totalProfit,
        totalExpenses,
        totalRefunds,
        totalDamages,
        salesCount: sales.length,
        cashBalance: totalSales - totalExpenses - totalRefunds,
        data: {
          salesBreakdown: sales.length,
          expensesBreakdown: expenses.length,
          refundsBreakdown: refunds.length,
          damagedCount: damagedProducts.length,
        },
      },
      create: {
        shopId,
        reportDate: dayStart,
        totalSales,
        totalProfit,
        totalExpenses,
        totalRefunds,
        totalDamages,
        salesCount: sales.length,
        cashBalance: totalSales - totalExpenses - totalRefunds,
        data: {
          salesBreakdown: sales.length,
          expensesBreakdown: expenses.length,
          refundsBreakdown: refunds.length,
          damagedCount: damagedProducts.length,
        },
      },
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
