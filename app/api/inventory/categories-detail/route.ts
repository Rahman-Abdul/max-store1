import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");

  let resolvedShopId: string | undefined;
  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) resolvedShopId = us.shopId;
  } else if (shopId) {
    resolvedShopId = shopId;
  }

  // Fetch all categories for this shop (both top-level and sub)
  const allCategories = await prisma.category.findMany({
    where: resolvedShopId ? { shopId: resolvedShopId } : {},
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true, name: true, sku: true, image: true,
          costPrice: true, stockQuantity: true, lowStockThreshold: true,
        },
        orderBy: { name: "asc" },
      },
      children: {
        include: {
          products: {
            where: { isActive: true },
            select: {
              id: true, name: true, sku: true, image: true,
              costPrice: true, stockQuantity: true, lowStockThreshold: true,
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Only top-level categories (parentId = null)
  const topLevel = allCategories.filter(c => !c.parentId);

  const enriched = topLevel.map(cat => {
    // ── Sub-category stats ──────────────────────────────────────
    const enrichedChildren = cat.children.map(sub => {
      const subProducts  = sub.products;
      const totalProducts = subProducts.length;
      const totalItems    = subProducts.reduce((s, p) => s + p.stockQuantity, 0);
      const totalValue    = subProducts.reduce((s, p) => s + Number(p.costPrice) * p.stockQuantity, 0);
      const outOfStock    = subProducts.filter(p => p.stockQuantity === 0).length;
      const lowStock      = subProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;

      return {
        id:             sub.id,
        name:           sub.name,
        slug:           sub.slug,
        parentId:       sub.parentId,
        products:       subProducts,
        totalProducts,
        totalItems,
        totalValue,
        outOfStock,
        lowStock,
      };
    });

    // ── Category stats (direct products only) ──────────────────
    const directProducts    = cat.products;
    const directTotalProducts = directProducts.length;
    const directTotalItems  = directProducts.reduce((s, p) => s + p.stockQuantity, 0);
    const directTotalValue  = directProducts.reduce((s, p) => s + Number(p.costPrice) * p.stockQuantity, 0);

    // ── Category stats (all = direct + all sub-categories) ─────
    const allSubProducts    = enrichedChildren.flatMap(sub => sub.products);
    const allProducts       = [...directProducts, ...allSubProducts];
    const totalProducts     = allProducts.length;
    const totalItems        = allProducts.reduce((s, p) => s + p.stockQuantity, 0);
    const totalValue        = allProducts.reduce((s, p) => s + Number(p.costPrice) * p.stockQuantity, 0);
    const outOfStock        = allProducts.filter(p => p.stockQuantity === 0).length;
    const lowStock          = allProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;

    return {
      id:                   cat.id,
      name:                 cat.name,
      slug:                 cat.slug,
      // Direct products (not in sub-category)
      products:             directProducts,
      directTotalProducts,
      directTotalItems,
      directTotalValue,
      // Sub-categories
      children:             enrichedChildren,
      subCategoryCount:     enrichedChildren.length,
      // Combined totals (direct + all sub-categories)
      totalProducts,
      totalItems,
      totalValue,
      outOfStock,
      lowStock,
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}
