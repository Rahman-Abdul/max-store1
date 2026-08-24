import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const q      = searchParams.get("q") || "";
  const shopId = searchParams.get("shopId");

  if (!q.trim()) return NextResponse.json({ success: true, data: [] });

  let where: any = {
    isActive: true,
    OR: [
      { name:    { contains: q, mode: "insensitive" } },
      { sku:     { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ],
  };

  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.shopId = us.shopId;
  } else if (shopId) {
    where.shopId = shopId;
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true, name: true, sku: true, barcode: true,
      costPrice: true, stockQuantity: true, lowStockThreshold: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 15,
  });

  return NextResponse.json({ success: true, data: products });
}
