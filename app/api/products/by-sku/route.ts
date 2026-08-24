import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sku    = searchParams.get("sku");
  const shopId = searchParams.get("shopId");

  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: {
      sku: { equals: sku, mode: "insensitive" },
      isActive: true,
      ...(shopId ? { shopId } : {}),
    },
    select: {
      id: true, name: true, sku: true, costPrice: true,
      stockQuantity: true, lowStockThreshold: true,
      category: { select: { name: true } },
    },
  });

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: product });
}
