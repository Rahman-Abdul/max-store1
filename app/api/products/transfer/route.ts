import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Root Super Admin can transfer products" }, { status: 403 });
  }

  const { productId, fromShopId, toShopId, quantity, notes } = await request.json();
  if (!productId || !toShopId || !quantity) {
    return NextResponse.json({ error: "productId, toShopId, and quantity are required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.stockQuantity < quantity) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${product.stockQuantity}` }, { status: 400 });
  }

  // Check if the product already exists in the target shop (by SKU)
  const existing = await prisma.product.findFirst({
    where: { sku: product.sku, shopId: toShopId },
  });

  await prisma.$transaction(async (tx) => {
    // Deduct from source
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: { decrement: quantity } },
    });
    await tx.inventoryLog.create({
      data: {
        productId, shopId: product.shopId, userId: user.id,
        type: "ADJUSTMENT", quantityBefore: product.stockQuantity,
        quantityChange: -quantity, quantityAfter: product.stockQuantity - quantity,
        notes: `Transferred ${quantity} units to shop ${toShopId}. ${notes || ""}`,
      },
    });

    if (existing) {
      // Add to existing product in target shop
      await tx.product.update({
        where: { id: existing.id },
        data: { stockQuantity: { increment: quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productId: existing.id, shopId: toShopId, userId: user.id,
          type: "ADJUSTMENT", quantityBefore: existing.stockQuantity,
          quantityChange: quantity, quantityAfter: existing.stockQuantity + quantity,
          notes: `Received ${quantity} units transferred from shop ${product.shopId}. ${notes || ""}`,
        },
      });
    } else {
      // Create a copy of the product in the target shop
      const newProduct = await tx.product.create({
        data: {
          name: product.name, sku: product.sku, barcode: product.barcode,
          description: product.description, costPrice: product.costPrice,
          stockQuantity: quantity, lowStockThreshold: product.lowStockThreshold,
          shopId: toShopId, categoryId: product.categoryId, supplierId: product.supplierId,
        },
      });
      await tx.inventoryLog.create({
        data: {
          productId: newProduct.id, shopId: toShopId, userId: user.id,
          type: "INITIAL", quantityBefore: 0, quantityChange: quantity, quantityAfter: quantity,
          notes: `Received via transfer from shop ${product.shopId}. ${notes || ""}`,
        },
      });
    }
  });

  return NextResponse.json({ success: true, message: `Transferred ${quantity} units of ${product.name}` });
}
