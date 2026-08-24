import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const limit  = parseInt(searchParams.get("limit") || "50");
  const staffId = searchParams.get("staffId");

  let where: any = {};

  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.shopAssignments = { some: { shopId: us.shopId } };
  } else {
    const shopIdParam = searchParams.get("shopId");
    if (shopIdParam) where.shopAssignments = { some: { shopId: shopIdParam } };
  }

  if (staffId) where.id = staffId;

  if (search) {
    where.OR = [
      { name:     { contains: search, mode: "insensitive" } },
      { email:    { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, username: true,
      role: true, status: true, phone: true, avatar: true,
      lastLoginAt: true, createdAt: true,
      shopAssignments: { include: { shop: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ success: true, data: staff });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json({ error: "Only Root Super Admin can create staff" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, username, password, role, shopId, phone } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Name, email, password and role are required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, ...(username ? [{ username }] : [])] },
  });
  if (existing) return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const generatedUsername = username || email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 100);

  const newUser = await prisma.user.create({
    data: {
      name, email: email.toLowerCase(), username: generatedUsername,
      password: hashed, role, phone: phone || null,
      createdBy: user.id,
      ...(shopId ? {
        shopAssignments: { create: { shopId } },
      } : {}),
    },
    select: {
      id: true, name: true, email: true, username: true,
      role: true, status: true, phone: true, createdAt: true,
      shopAssignments: { include: { shop: { select: { id: true, name: true } } } },
    },
  });

  // Audit log
  await prisma.activityLog.create({
    data: { userId: user.id, action: "CREATE_USER", details: `Created ${role} account for ${name} (${email})` },
  }).catch(() => {});

  return NextResponse.json({ success: true, data: newUser });
}
