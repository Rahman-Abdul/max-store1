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
  const { reason, disposition, damageType } = await request.json();

  if (!reason?.trim())
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  const returnRecord = await prisma.return.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      sale:  { select: { shopId: true } },
    },
  });

  if (!returnRecord)
    return NextResponse.json({ error: "Return not found" }, { status: 404 });

  if (returnRecord.status !== "PENDING")
    return NextResponse.json({ error: "Return already processed" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    if (disposition === "damage") {
      for (const item of returnRecord.items) {
        const costLoss = Number(item.product.costPrice) * item.quantity;
        await tx.damagedProduct.create({
          data: {
            productId:    item.productId,
            shopId:       returnRecord.sale.shopId,
            reportedById: user.id,
            quantity:     item.quantity,
            damageType:   (damageType as any) || "DEFECTIVE",
            reason:       reason.trim(),
            costLoss,
            notes:        `From rejected return #${id.slice(-6)}`,
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId:      item.productId,
            shopId:         returnRecord.sale.shopId,
            userId:         user.id,
            type:           "DAMAGE",
            quantityBefore: item.product.stockQuantity,
            quantityChange: 0,
            quantityAfter:  item.product.stockQuantity,
            notes:          `Return rejected, logged as damage: ${reason.trim()}`,
          },
        });
      }
    } else {
      // Restock
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
            notes:          `Return rejected but restocked: ${reason.trim()}`,
          },
        });
      }
    }

    // ── This is the critical update — status must change to REJECTED ──
    await tx.return.update({
      where: { id },
      data: {
        status:    "REJECTED",
        notes:     reason.trim(),
        restocked: disposition === "restock",
      },
    });
  });

  return NextResponse.json({ success: true });
}
