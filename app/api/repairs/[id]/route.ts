import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, v) => {
      if (v !== null && typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
      if (typeof v === "bigint") return Number(v);
      return v;
    })
  );
}

// ─── GET /api/repairs/[id] ────────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const repair = await prisma.repair.findUnique({
    where: { id },
    include: {
      staff:     { select: { id: true, name: true } },
      cashier:   { select: { id: true, name: true } },
      partsUsed: true,
      shop:      { select: { id: true, name: true, phone: true, email: true } },
    },
  });

  if (!repair) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: serialize(repair) });
}

// ─── PATCH /api/repairs/[id] ──────────────────────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.repair.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const LOCKED_STATUSES = ["COMPLETED", "CANCELLED"];

  // Status-only update (from the status buttons)
  if (body.status && Object.keys(body).length === 1) {
    const updateData: any = { status: body.status };
    if (body.status === "COMPLETED") {
      updateData.completedAt   = new Date();
      updateData.cashierId     = user.id;
      updateData.paymentStatus = "COMPLETED";
      updateData.confirmedAt   = new Date();
    }
    const repair = await prisma.repair.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: serialize(repair) });
  }

  // Full edit — block if already locked
  if (LOCKED_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: "This repair is locked and cannot be edited" }, { status: 403 });
  }

  const {
    customerName, customerPhone, engineerName, deviceType, deviceModel,
    issueDesc, repairNotes, laborCost, paymentMethod, status, parts = [],
  } = body;

  const totalPartsCost = parts.reduce(
    (s: number, p: any) => s + (Number(p.chargePrice) || 0) * (Number(p.quantity) || 1),
    0
  );
  const totalAmount = totalPartsCost + (Number(laborCost) || 0);

  const repair = await prisma.$transaction(async (tx) => {
    await tx.repairPart.deleteMany({ where: { repairId: id } });

    return tx.repair.update({
      where: { id },
      data: {
        customerName:  customerName  || undefined,
        customerPhone: customerPhone || null,
        engineerName:  engineerName  || null,
        deviceType:    deviceType    || undefined,
        deviceModel:   deviceModel   || null,
        issueDesc:     issueDesc     || undefined,
        repairNotes:   repairNotes   || null,
        laborCost:     Number(laborCost) || 0,
        totalPartsCost,
        totalAmount,
        paymentMethod: paymentMethod || undefined,
        ...(status ? { status } : {}),
        partsUsed: {
          create: parts.map((p: any) => ({
            name:        p.name,
            quantity:    Number(p.quantity)    || 1,
            unitCost:    Number(p.unitCost)    || 0,
            chargePrice: Number(p.chargePrice) || 0,
            totalCost:   (Number(p.chargePrice) || 0) * (Number(p.quantity) || 1),
            productId:   p.productId || null,
            shopName:    p.shopName  || null,
            shopOwner:   p.shopOwner || null,
          })),
        },
      },
      include: {
        staff:     { select: { id: true, name: true } },
        cashier:   { select: { id: true, name: true } },
        partsUsed: true,
        shop:      { select: { id: true, name: true, phone: true, email: true } },
      },
    });
  });

  return NextResponse.json({ success: true, data: serialize(repair) });
}
