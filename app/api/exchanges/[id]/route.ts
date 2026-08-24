import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { quantityReturned, quantityGiven, extraPayment, refundAmount, priceDifference, notes } = await request.json();

  const swap = await prisma.productSwap.findUnique({ where: { id } });
  if (!swap) return NextResponse.json({ error: "Exchange not found" }, { status: 404 });

  const updated = await prisma.productSwap.update({
    where: { id },
    data: {
      ...(quantityReturned !== undefined ? { quantityReturned } : {}),
      ...(quantityGiven    !== undefined ? { quantityGiven }    : {}),
      ...(extraPayment     !== undefined ? { extraPayment }     : {}),
      ...(refundAmount     !== undefined ? { refundAmount }     : {}),
      ...(priceDifference  !== undefined ? { priceDifference }  : {}),
      ...(notes            !== undefined ? { notes }            : {}),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const swap = await prisma.productSwap.findUnique({
    where: { id },
    include: {
      sale: { select: { shopId: true, orderCode: true } },
    },
  });
  if (!swap) return NextResponse.json({ error: "Exchange not found" }, { status: 404 });

  // Reverse the stock changes: give back new product, deduct returned product
  await prisma.$transaction(async (tx) => {
    const [origProd, newProd] = await Promise.all([
      tx.product.findUnique({ where: { id: swap.originalProductId } }),
      tx.product.findUnique({ where: { id: swap.newProductId } }),
    ]);

    if (origProd) {
      // Original product was restocked during exchange — now deduct it back
      const newStock = origProd.stockQuantity - swap.quantityReturned;
      await tx.product.update({ where: { id: swap.originalProductId }, data: { stockQuantity: Math.max(0, newStock) } });
      await tx.inventoryLog.create({
        data: {
          productId: swap.originalProductId, shopId: swap.sale.shopId,
          userId: user.id, type: "ADJUSTMENT",
          quantityBefore: origProd.stockQuantity,
          quantityChange: -swap.quantityReturned,
          quantityAfter: Math.max(0, newStock),
          notes: `Exchange deleted — reversing stock for ${swap.sale.orderCode}`,
        },
      });
    }
    if (newProd) {
      // New product was deducted during exchange — now add it back
      const newStock = newProd.stockQuantity + swap.quantityGiven;
      await tx.product.update({ where: { id: swap.newProductId }, data: { stockQuantity: newStock } });
      await tx.inventoryLog.create({
        data: {
          productId: swap.newProductId, shopId: swap.sale.shopId,
          userId: user.id, type: "ADJUSTMENT",
          quantityBefore: newProd.stockQuantity,
          quantityChange: swap.quantityGiven,
          quantityAfter: newStock,
          notes: `Exchange deleted — reversing stock for ${swap.sale.orderCode}`,
        },
      });
    }

    await tx.productSwap.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
