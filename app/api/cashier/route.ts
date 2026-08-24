import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderCode = searchParams.get("orderCode");

  if (!orderCode) {
    // Return pending sales for the cashier
    const user = session.user as any;
    let where: any = { status: "PENDING" };
    if (user.role === "CASHIER" || user.role === "SHOP_ADMIN") {
      const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
      if (us) where.shopId = us.shopId;
    }

    const pendingSales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        staff: { select: { id: true, name: true } },
        customer: true,
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, data: pendingSales });
  }

  const sale = await prisma.sale.findUnique({
    where: { orderCode },
    include: {
      items: { include: { product: true } },
      staff: { select: { id: true, name: true } },
      customer: true,
      shop: true,
      payments: true,
      receipt: true,
    },
  });

  if (!sale) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: sale });
}
