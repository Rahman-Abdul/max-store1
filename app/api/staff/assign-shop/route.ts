import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Root Super Admin can assign shops" }, { status: 403 });
  }

  const { userId, shopId } = await request.json();
  if (!userId || !shopId) return NextResponse.json({ error: "userId and shopId required" }, { status: 400 });

  // Upsert — don't create duplicates
  const existing = await prisma.userShop.findFirst({ where: { userId, shopId } });
  if (!existing) {
    await prisma.userShop.create({ data: { userId, shopId } });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Root Super Admin can remove shop assignments" }, { status: 403 });
  }

  const { userId, shopId } = await request.json();
  await prisma.userShop.deleteMany({ where: { userId, shopId } });
  return NextResponse.json({ success: true });
}
