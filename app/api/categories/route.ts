import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId   = searchParams.get("shopId");
  const parentId = searchParams.get("parentId");
  const search   = searchParams.get("search") || "";

  const where: any = {};
  if (shopId)              where.shopId   = shopId;
  if (parentId === "null") where.parentId = null;
  else if (parentId)       where.parentId = parentId;
  if (search.trim())       where.name     = { contains: search, mode: "insensitive" };

  const categories = await prisma.category.findMany({
    where,
    select: {
      id: true, name: true, slug: true, parentId: true,
      children:  { select: { id: true, name: true } },
      _count:    { select: { products: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { name, shopId, parentId } = await request.json();
  if (!name || !shopId) return NextResponse.json({ error: "name and shopId required" }, { status: 400 });

  const slug      = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const conflict  = await prisma.category.findFirst({ where: { slug, shopId } });
  const finalSlug = conflict ? `${slug}-${Date.now()}` : slug;

  if (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
  }

  const category = await prisma.category.create({
    data: { name: name.trim(), slug: finalSlug, shopId, parentId: parentId || null },
  });

  return NextResponse.json({ success: true, data: category });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id, name } = await request.json();
  if (!id || !name?.trim()) return NextResponse.json({ error: "id and name required" }, { status: 400 });

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // Regenerate slug from new name
  const newSlug   = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const conflict  = await prisma.category.findFirst({
    where: { slug: newSlug, shopId: existing.shopId, id: { not: id } },
  });
  const finalSlug = conflict ? `${newSlug}-${Date.now()}` : newSlug;

  const updated = await prisma.category.update({
    where: { id },
    data:  { name: name.trim(), slug: finalSlug },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count:   { select: { products: true, children: true } },
      children: { include: { _count: { select: { products: true } } } },
    },
  });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  // Count all products (direct + in sub-categories)
  const subProductCount = category.children.reduce((s, c) => s + c._count.products, 0);
  const totalProducts   = category._count.products + subProductCount;

  if (totalProducts > 0) {
    return NextResponse.json({
      error: `Cannot delete: ${totalProducts} product${totalProducts !== 1 ? "s" : ""} still linked to this category. Reassign them first.`,
    }, { status: 400 });
  }

  // Delete sub-categories first (they have no products since totalProducts = 0)
  if (category._count.children > 0) {
    await prisma.category.deleteMany({ where: { parentId: id } });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
