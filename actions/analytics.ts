"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeData } from "@/lib/utils";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

async function getShopFilter(user: any, shopId?: string) {
  if (user.role === "SHOP_ADMIN" || user.role === "STAFF" || user.role === "CASHIER") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    return userShop ? { shopId: userShop.shopId } : {};
  }
  if (shopId) return { shopId };
  return {};
}

export async function getDashboardStats(shopId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const shopFilter = await getShopFilter(user, shopId);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Run queries in two batches to avoid connection pool exhaustion
  const [todaySales, monthSales, lastMonthSales, totalCustomers, totalProducts] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { ...shopFilter, status: "COMPLETED", createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...shopFilter, status: "COMPLETED", createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...shopFilter, status: "COMPLETED", createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { totalAmount: true, totalProfit: true },
        _count: true,
      }),
      prisma.customer.count({ where: shopFilter }),
      prisma.product.count({ where: { ...shopFilter, isActive: true } }),
    ]);

  const [pendingRefunds, totalDebts, expenses, pendingOrders] = await Promise.all([
    prisma.refund.count({ where: { status: "PENDING", ...(shopFilter.shopId ? { sale: { shopId: shopFilter.shopId } } : {}) } }),
    prisma.debt.aggregate({
      where: { isPaid: false, ...(shopFilter.shopId ? { customer: { shopId: shopFilter.shopId } } : {}) },
      _sum: { balance: true },
    }),
    prisma.expense.aggregate({
      where: { ...shopFilter, status: "APPROVED", expenseDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.sale.count({ where: { ...shopFilter, status: "PENDING" } }),
  ]);

  // stockQuantity <= lowStockThreshold — fetch products and filter in JS to avoid raw SQL issues
  let lowStockCount = 0;
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: { ...shopFilter, isActive: true },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    lowStockCount = lowStockProducts.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    ).length;
  } catch {
    lowStockCount = 0;
  }

  const monthRevenue = Number(monthSales._sum.totalAmount || 0);
  const lastMonthRevenue = Number(lastMonthSales._sum.totalAmount || 0);
  const revenueGrowth =
    lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  const monthProfit = Number(monthSales._sum.totalProfit || 0);
  const lastMonthProfit = Number(lastMonthSales._sum.totalProfit || 0);
  const profitGrowth =
    lastMonthProfit > 0 ? ((monthProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0;

  return {
    success: true,
    data: {
      today: {
        sales: todaySales._count,
        revenue: Number(todaySales._sum.totalAmount || 0),
        profit: Number(todaySales._sum.totalProfit || 0),
      },
      month: {
        sales: monthSales._count,
        revenue: monthRevenue,
        profit: monthProfit,
        expenses: Number(expenses._sum.amount || 0),
      },
      growth: { revenue: revenueGrowth, profit: profitGrowth },
      counts: {
        customers: totalCustomers,
        products: totalProducts,
        pendingRefunds,
        lowStock: typeof lowStockCount === "number" ? lowStockCount : 0,
        pendingOrders,
      },
      debts: { total: Number(totalDebts._sum.balance || 0) },
    },
  };
}

export async function getSalesTrend(
  period: "week" | "month" | "year" = "month",
  shopId?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  const shopFilter = await getShopFilter(user, shopId);

  const now = new Date();
  let startDate: Date;
  let groupBy: string;

  if (period === "week") {
    startDate = subDays(now, 7);
    groupBy = "day";
  } else if (period === "month") {
    startDate = subDays(now, 30);
    groupBy = "day";
  } else {
    startDate = subMonths(now, 12);
    groupBy = "month";
  }

  const sales = await prisma.sale.findMany({
    where: { ...shopFilter, status: "COMPLETED", createdAt: { gte: startDate } },
    select: { totalAmount: true, totalProfit: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped = sales.reduce((acc: Record<string, any>, sale) => {
    const key =
      groupBy === "day"
        ? sale.createdAt.toISOString().split("T")[0]
        : `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, "0")}`;

    if (!acc[key]) acc[key] = { period: key, revenue: 0, profit: 0, sales: 0 };
    acc[key].revenue += Number(sale.totalAmount);
    acc[key].profit += Number(sale.totalProfit);
    acc[key].sales += 1;
    return acc;
  }, {});

  return { success: true, data: serializeData(Object.values(grouped)) };
}

export async function getBuyerTypeBreakdown(shopId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  const shopFilter = await getShopFilter(user, shopId);

  const data = await prisma.sale.groupBy({
    by: ["buyerType"],
    where: { ...shopFilter, status: "COMPLETED" },
    _count: true,
    _sum: { totalAmount: true, totalProfit: true },
  });

  return {
    success: true,
    data: data.map((d) => ({
      buyerType: d.buyerType,
      count: d._count,
      revenue: Number(d._sum.totalAmount || 0),
      profit: Number(d._sum.totalProfit || 0),
    })),
  };
}

export async function getTopProducts(shopId?: string, limit = 10) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  const shopFilter = await getShopFilter(user, shopId);

  const topProducts = await prisma.saleItem.groupBy({
    by: ["productId", "productName"],
    where: { sale: { ...shopFilter, status: "COMPLETED" } },
    _sum: { quantity: true, totalAmount: true, profit: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: limit,
  });

  return {
    success: true,
    data: topProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      totalSold: p._sum.quantity || 0,
      totalRevenue: Number(p._sum.totalAmount || 0),
      totalProfit: Number(p._sum.profit || 0),
      transactions: p._count,
    })),
  };
}

export async function getStaffPerformance(shopId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  const shopFilter = await getShopFilter(user, shopId);

  const performance = await prisma.sale.groupBy({
    by: ["staffId"],
    where: { ...shopFilter, status: "COMPLETED" },
    _sum: { totalAmount: true, totalProfit: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
  });

  const staffIds = performance.map((p) => p.staffId);
  const staff = await prisma.user.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true, avatar: true },
  });
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s]));

  return {
    success: true,
    data: performance.map((p) => ({
      staffId: p.staffId,
      staffName: staffMap[p.staffId]?.name || "Unknown",
      staffAvatar: staffMap[p.staffId]?.avatar,
      totalSales: p._count,
      totalRevenue: Number(p._sum.totalAmount || 0),
      totalProfit: Number(p._sum.totalProfit || 0),
      averageOrder: p._count > 0 ? Number(p._sum.totalAmount || 0) / p._count : 0,
    })),
  };
}

export async function getGlobalShopStats() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") throw new Error("Only Root Super Admin can view global stats");

  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    include: { _count: { select: { products: true, sales: true, users: true } } },
  });

  // Sequential to avoid connection pool exhaustion when many shops
  const shopStats = [];
  for (const shop of shops) {
    const revenue = await prisma.sale.aggregate({
      where: { shopId: shop.id, status: "COMPLETED", createdAt: { gte: startOfMonth(new Date()) } },
      _sum: { totalAmount: true, totalProfit: true },
    });
    shopStats.push({
      shop,
      monthRevenue: Number(revenue._sum.totalAmount || 0),
      monthProfit: Number(revenue._sum.totalProfit || 0),
    });
  }

  return { success: true, data: serializeData(shopStats) };
}
