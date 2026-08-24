import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const lowStock = searchParams.get("lowStock") === "true";

  const user = session.user as any;
  let where: any = {};

  if (user.role === "SHOP_ADMIN" || user.role === "STAFF" || user.role === "CASHIER") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.shopId = us.shopId;
  } else if (shopId) {
    where.shopId = shopId;
  }

  if (categoryId) where.categoryId = categoryId;
  if (lowStock) where = { ...where, stockQuantity: { lte: prisma.product.fields.lowStockThreshold } };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      supplier: { select: { id: true, name: true } },
      shop: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: true, data: products });
}
