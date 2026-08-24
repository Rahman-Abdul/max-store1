import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  let where: any = { isActive: true };
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  } else if (shopId) {
    where.shopId = shopId;
  }

  const [products, categories, suppliers] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { costPrice: true, stockQuantity: true, lowStockThreshold: true, categoryId: true, supplierId: true },
    }),
    prisma.category.count({ where: shopId ? { shopId } : user.role === "SHOP_ADMIN" ? { shopId: where.shopId } : {} }),
    prisma.supplier.count({}),
  ]);

  const totalProducts    = products.length;
  const outOfStock       = products.filter(p => p.stockQuantity === 0).length;
  const lowStock         = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
  const wellStocked      = products.filter(p => p.stockQuantity > p.lowStockThreshold).length;
  const totalValue       = products.reduce((s, p) => s + (Number(p.costPrice) * p.stockQuantity), 0);

  const totalItems = products.reduce((s, p) => s + p.stockQuantity, 0);

  return NextResponse.json({
    success: true,
    data: { totalProducts, outOfStock, lowStock, wellStocked, totalValue, totalItems, totalCategories: categories, totalSuppliers: suppliers },
  });
}
