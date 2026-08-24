import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  let productWhere: any = { isActive: true };
  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) productWhere.shopId = us.shopId;
  } else if (shopId) {
    productWhere.shopId = shopId;
  }

  const suppliers = await prisma.supplier.findMany({
    include: {
      products: {
        where: productWhere,
        select: {
          id: true, name: true, sku: true, image: true,
          costPrice: true, stockQuantity: true, lowStockThreshold: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Only return suppliers that have products matching the filter
  const filtered = suppliers.filter(s => s.products.length > 0);

  return NextResponse.json({ success: true, data: filtered });
}
