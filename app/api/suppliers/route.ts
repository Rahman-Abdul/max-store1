import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const where: any = {};
  if (shopId) where.shopId = shopId;
  const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({ success: true, data: suppliers });
}
