import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const returnRecord = await prisma.return.findUnique({ where: { id } });
  if (!returnRecord) return NextResponse.json({ error: "Return not found" }, { status: 404 });
  if (!["PENDING", "REJECTED"].includes(returnRecord.status))
    return NextResponse.json({ error: "Only pending or rejected returns can be deleted" }, { status: 400 });

  // Delete items first (cascade may handle this but being explicit)
  await prisma.returnItem.deleteMany({ where: { returnId: id } });
  await prisma.return.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
