import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      users: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, status: true } },
        },
      },
      sales: {
        where: { status: { in: ["COMPLETED", "CONFIRMED"] } },
        select: { totalAmount: true, totalProfit: true },
      },
    },
  });

  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Fetch all stats in parallel — separate queries to avoid invalid include keys
  const [totalProducts, allProducts, outOfStockCount, pendingSales, recentSales] = await Promise.all([
    prisma.product.count({ where: { shopId: id, isActive: true } }),

    // Fetch for low-stock JS filter (Prisma can't compare two columns in WHERE)
    prisma.product.findMany({
      where: { shopId: id, isActive: true, stockQuantity: { gt: 0 } },
      select: { stockQuantity: true, lowStockThreshold: true },
    }),

    prisma.product.count({ where: { shopId: id, isActive: true, stockQuantity: 0 } }),

    prisma.sale.count({ where: { shopId: id, status: "PENDING" } }),

    prisma.sale.findMany({
      where: { shopId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, orderCode: true, status: true, totalAmount: true,
        customerName: true, createdAt: true,
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const lowStockCount  = allProducts.filter(p => p.stockQuantity <= p.lowStockThreshold).length;
  const totalRevenue   = shop.sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
  const totalProfit    = shop.sales.reduce((s, sale) => s + Number(sale.totalProfit), 0);

  const { sales, users, ...shopRest } = shop as any;

  return NextResponse.json({
    success: true,
    data: {
      ...shopRest,
      totalProducts,
      totalStaff:    shop.users.length,
      totalSales:    shop.sales.length,
      totalRevenue,
      totalProfit,
      lowStockCount,
      outOfStockCount,
      pendingSales,
      staff:         shop.users,
      recentSales,
    },
  });
}
