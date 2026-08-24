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

  if (!productId || !fromShopId || !toShopId || !quantity) {
    return NextResponse.json({ error: "productId, fromShopId, toShopId, quantity required" }, { status: 400 });
  }
  if (fromShopId === toShopId) {
    return NextResponse.json({ error: "Source and destination shops must be different" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (product.shopId !== fromShopId) return NextResponse.json({ error: "Product does not belong to source shop" }, { status: 400 });
  if (product.stockQuantity < quantity) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${product.stockQuantity}` }, { status: 400 });
  }

  // Check if same SKU exists in destination shop
  const existingInDest = await prisma.product.findFirst({
    where: { sku: product.sku, shopId: toShopId, isActive: true },
  });

  await prisma.$transaction(async (tx) => {
    if (existingInDest) {
      // Add stock to existing product in destination
      await tx.product.update({
        where: { id: existingInDest.id },
        data: { stockQuantity: { increment: quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productId: existingInDest.id, shopId: toShopId, userId: user.id,
          type: "RESTOCK", quantityBefore: existingInDest.stockQuantity,
          quantityChange: quantity, quantityAfter: existingInDest.stockQuantity + quantity,
          notes: `Transfer from ${fromShopId}. ${notes || ""}`.trim(),
        },
      });
    } else {
      // Create a copy of the product in the destination shop
      await tx.product.create({
        data: {
          name: product.name, sku: product.sku, barcode: product.barcode,
          description: product.description, costPrice: product.costPrice,
          stockQuantity: quantity, lowStockThreshold: product.lowStockThreshold,
          categoryId: product.categoryId, supplierId: product.supplierId,
          shopId: toShopId, image: product.image,
        },
      });
    }

    // Deduct from source
    const newQty = product.stockQuantity - quantity;
    await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: newQty },
    });
    await tx.inventoryLog.create({
      data: {
        productId, shopId: fromShopId, userId: user.id,
        type: "ADJUSTMENT", quantityBefore: product.stockQuantity,
        quantityChange: -quantity, quantityAfter: newQty,
        notes: `Transfer to shop ${toShopId}. ${notes || ""}`.trim(),
      },
    });
  });

  return NextResponse.json({ success: true, message: `${quantity} units of "${product.name}" transferred successfully` });
}
