import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip  = (page - 1) * limit;

  let where: any = {};
  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.sale = { shopId: us.shopId };
  }

  const [swaps, total] = await Promise.all([
    prisma.productSwap.findMany({
      where,
      include: {
        sale: { select: { id: true, orderCode: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.productSwap.count({ where }),
  ]);

  // Enrich with product names
  const enriched = await Promise.all(swaps.map(async (swap) => {
    const [orig, newProd] = await Promise.all([
      prisma.product.findUnique({ where: { id: swap.originalProductId }, select: { name: true, sku: true } }),
      prisma.product.findUnique({ where: { id: swap.newProductId },      select: { name: true, sku: true } }),
    ]);
    return { ...swap, originalProduct: orig, newProduct: newProd };
  }));

  return NextResponse.json({ success: true, data: enriched, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { saleId, originalProductId, newProductId, quantityReturned, quantityGiven, priceDifference, extraPayment, refundAmount } = await request.json();

  if (!saleId || !originalProductId || !newProductId)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const [sale, origProduct, newProduct] = await Promise.all([
    prisma.sale.findUnique({ where: { id: saleId } }),
    prisma.product.findUnique({ where: { id: originalProductId } }),
    prisma.product.findUnique({ where: { id: newProductId } }),
  ]);

  if (!sale || !origProduct || !newProduct)
    return NextResponse.json({ error: "Sale or product not found" }, { status: 404 });
  if (sale.status !== "COMPLETED")
    return NextResponse.json({ error: "Only completed sales can be exchanged" }, { status: 400 });
  if (newProduct.stockQuantity < quantityGiven)
    return NextResponse.json({ error: `Insufficient stock for ${newProduct.name}` }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Return original product to stock
    await tx.product.update({
      where: { id: originalProductId },
      data:  { stockQuantity: { increment: quantityReturned } },
    });

    // Deduct new product from stock
    await tx.product.update({
      where: { id: newProductId },
      data:  { stockQuantity: { decrement: quantityGiven } },
    });

    // Log inventory changes
    await tx.inventoryLog.createMany({
      data: [
        {
          productId: originalProductId, shopId: sale.shopId, userId: user.id,
          type: "RETURN", quantityBefore: origProduct.stockQuantity,
          quantityChange: quantityReturned, quantityAfter: origProduct.stockQuantity + quantityReturned,
          notes: `Exchange return from sale ${sale.orderCode}`,
        },
        {
          productId: newProductId, shopId: sale.shopId, userId: user.id,
          type: "SALE", quantityBefore: newProduct.stockQuantity,
          quantityChange: -quantityGiven, quantityAfter: newProduct.stockQuantity - quantityGiven,
          notes: `Exchange given for sale ${sale.orderCode}`,
        },
      ],
    });

    // Record the swap
    await tx.productSwap.create({
      data: {
        saleId, originalProductId, newProductId,
        quantityReturned, quantityGiven,
        priceDifference: priceDifference || 0,
        extraPayment:    extraPayment    || 0,
        refundAmount:    refundAmount    || 0,
      },
    });
  });

  return NextResponse.json({ success: true });
}
