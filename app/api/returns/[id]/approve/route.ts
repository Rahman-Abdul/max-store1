import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      sale:  { select: { shopId: true, orderCode: true } },
    },
  });

  if (!returnRecord)
    return NextResponse.json({ error: "Return not found" }, { status: 404 });
  if (returnRecord.status !== "PENDING")
    return NextResponse.json({ error: "Return already processed" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Restock each item and log it
    for (const item of returnRecord.items) {
      const before   = item.product.stockQuantity;
      const newStock = before + item.quantity;

      await tx.product.update({
        where: { id: item.productId },
        data:  { stockQuantity: newStock },
      });

      await tx.inventoryLog.create({
        data: {
          productId:      item.productId,
          shopId:         returnRecord.sale.shopId,
          userId:         user.id,
          type:           "RETURN",
          quantityBefore: before,
          quantityChange: item.quantity,
          quantityAfter:  newStock,
          reference:      returnRecord.saleId,
          notes:          `Return approved from sale ${returnRecord.sale.orderCode}`,
        },
      });
    }

    // Mark return as RESTOCKED (approved + restocked)
    await tx.return.update({
      where: { id },
      data:  { status: "RESTOCKED", restocked: true },
    });
  });

  return NextResponse.json({ success: true });
}
