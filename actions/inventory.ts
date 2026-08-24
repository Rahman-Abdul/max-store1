"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeData } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function createProduct(data: {
  name: string; sku: string; barcode?: string; description?: string;
  costPrice: number; stockQuantity: number; lowStockThreshold: number;
  categoryId?: string; categoryName?: string; parentCategoryId?: string;
  supplierId?: string; supplierName?: string;
  shopId: string; image?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) throw new Error("Insufficient permissions");

  const existing = await prisma.product.findUnique({
    where: { sku_shopId: { sku: data.sku, shopId: data.shopId } },
  });
  if (existing) throw new Error("SKU already exists in this shop");

  const toSlug = (str: string) =>
    str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Resolve category (with optional sub-category under parentCategoryId)
  let resolvedCategoryId = data.categoryId;
  if (!resolvedCategoryId && data.categoryName?.trim()) {
    const catName  = data.categoryName.trim();
    const parentId = data.parentCategoryId || null;

    // Search for existing category with same name (and same parent if sub-category)
    const existingCat = await prisma.category.findFirst({
      where: {
        name: { equals: catName, mode: "insensitive" },
        shopId: data.shopId,
        ...(parentId !== null ? { parentId } : {}),
      },
    });

    if (existingCat) {
      resolvedCategoryId = existingCat.id;
    } else {
      const baseSlug = toSlug(catName);
      const slugConflict = await prisma.category.findFirst({
        where: { slug: baseSlug, shopId: data.shopId },
      });
      const slug = slugConflict ? `${baseSlug}-${Date.now()}` : baseSlug;
      const created = await prisma.category.create({
        data: {
          name: catName, slug, shopId: data.shopId,
          ...(parentId ? { parentId } : {}),
        },
      });
      resolvedCategoryId = created.id;
    }
  }

  // Resolve supplier
  let resolvedSupplierId = data.supplierId;
  if (!resolvedSupplierId && data.supplierName?.trim()) {
    const supName = data.supplierName.trim();
    const existingSup = await prisma.supplier.findFirst({
      where: { name: { equals: supName, mode: "insensitive" } },
    });
    if (existingSup) {
      resolvedSupplierId = existingSup.id;
    } else {
      const created = await prisma.supplier.create({
        data: { name: supName },
      });
      resolvedSupplierId = created.id;
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    const createData: any = {
      name: data.name, sku: data.sku, barcode: data.barcode,
      description: data.description, costPrice: data.costPrice,
      stockQuantity: data.stockQuantity, lowStockThreshold: data.lowStockThreshold,
      categoryId: resolvedCategoryId, supplierId: resolvedSupplierId,
      shopId: data.shopId, image: data.image,
      createdById: user.id,
    };

    const created = await tx.product.create({ data: createData });

    if (data.stockQuantity > 0) {
      await tx.inventoryLog.create({
        data: {
          productId: created.id, shopId: data.shopId, userId: user.id,
          type: "INITIAL", quantityBefore: 0,
          quantityChange: data.stockQuantity, quantityAfter: data.stockQuantity,
          notes: "Initial stock",
        },
      });
    }
    return created;
  });

  revalidatePath("/dashboard/inventory");
  return { success: true, data: serializeData(product) };
}

export async function updateProduct(productId: string, data: {
  name?: string; barcode?: string; description?: string; costPrice?: number;
  lowStockThreshold?: number; categoryId?: string; categoryName?: string;
  parentCategoryName?: string;
  supplierId?: string; supplierName?: string;
  image?: string; isActive?: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) throw new Error("Insufficient permissions");

  const toSlug = (str: string) =>
    str.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { shopId: true },
  });
  if (!product) throw new Error("Product not found");

  // Resolve category (with optional parent for sub-category)
  let resolvedCategoryId = data.categoryId;
  if (!resolvedCategoryId && data.categoryName?.trim()) {
    const catName = data.categoryName.trim();

    // If parentCategoryName given, resolve or create parent first
    let parentId: string | null = null;
    if (data.parentCategoryName?.trim()) {
      const parentName = data.parentCategoryName.trim();
      const existingParent = await prisma.category.findFirst({
        where: { name: { equals: parentName, mode: "insensitive" }, shopId: product.shopId, parentId: null },
      });
      if (existingParent) {
        parentId = existingParent.id;
      } else {
        const pSlug = toSlug(parentName);
        const pConflict = await prisma.category.findFirst({ where: { slug: pSlug, shopId: product.shopId } });
        const pFinalSlug = pConflict ? `${pSlug}-${Date.now()}` : pSlug;
        const created = await prisma.category.create({
          data: { name: parentName, slug: pFinalSlug, shopId: product.shopId },
        });
        parentId = created.id;
      }
    }

    // Now resolve or create the actual category (sub or top-level)
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: catName, mode: "insensitive" },
        shopId: product.shopId,
        ...(parentId ? { parentId } : {}),
      },
    });
    if (existing) {
      resolvedCategoryId = existing.id;
    } else {
      const baseSlug = toSlug(catName);
      const conflict = await prisma.category.findFirst({ where: { slug: baseSlug, shopId: product.shopId } });
      const slug = conflict ? `${baseSlug}-${Date.now()}` : baseSlug;
      const created = await prisma.category.create({
        data: { name: catName, slug, shopId: product.shopId, ...(parentId ? { parentId } : {}) },
      });
      resolvedCategoryId = created.id;
    }
  }

  // Resolve supplier
  let resolvedSupplierId = data.supplierId;
  if (!resolvedSupplierId && data.supplierName?.trim()) {
    const supName = data.supplierName.trim();
    const existing = await prisma.supplier.findFirst({
      where: { name: { equals: supName, mode: "insensitive" } },
    });
    resolvedSupplierId = existing?.id || (await prisma.supplier.create({
      data: { name: supName },
    })).id;
  }

  const { categoryName, supplierName, parentCategoryName, ...rest } = data;
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...rest,
      ...(resolvedCategoryId ? { categoryId: resolvedCategoryId } : {}),
      ...(resolvedSupplierId ? { supplierId: resolvedSupplierId } : {}),
    },
  });
  revalidatePath("/dashboard/inventory");
  return { success: true, data: serializeData(updated) };
}

export async function restockProduct(data: {
  productId: string; quantity: number; costPrice?: number; supplierId?: string; notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) throw new Error("Insufficient permissions");

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new Error("Product not found");

  const before = product.stockQuantity;
  const after  = before + data.quantity;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: data.productId },
      data: { stockQuantity: after, ...(data.costPrice ? { costPrice: data.costPrice } : {}) },
    });
    await tx.inventoryLog.create({
      data: {
        productId: data.productId, shopId: product.shopId, userId: user.id,
        type: "RESTOCK", quantityBefore: before,
        quantityChange: data.quantity, quantityAfter: after, notes: data.notes,
      },
    });
    await tx.restockHistory.create({
      data: {
        productId: data.productId, quantity: data.quantity,
        costPrice: data.costPrice, supplierId: data.supplierId, notes: data.notes,
      },
    });
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function recordDamagedProduct(data: {
  productId: string; shopId: string; quantity: number;
  damageType: string; reason: string; notes?: string; supplierId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new Error("Product not found");
  if (product.stockQuantity < data.quantity) throw new Error("Cannot record more damaged items than available stock");

  const costLoss = Number(product.costPrice) * data.quantity;
  const before   = product.stockQuantity;
  const after    = before - data.quantity;

  await prisma.$transaction(async (tx) => {
    await tx.damagedProduct.create({
      data: {
        productId: data.productId, shopId: data.shopId, reportedById: user.id,
        quantity: data.quantity, damageType: data.damageType as any,
        reason: data.reason, notes: data.notes, supplierId: data.supplierId, costLoss,
      },
    });
    await tx.product.update({ where: { id: data.productId }, data: { stockQuantity: after } });
    await tx.inventoryLog.create({
      data: {
        productId: data.productId, shopId: data.shopId, userId: user.id,
        type: "DAMAGE", quantityBefore: before,
        quantityChange: -data.quantity, quantityAfter: after, notes: data.reason,
      },
    });
  });

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function getProducts(params: {
  shopId?: string; categoryId?: string; search?: string;
  lowStockOnly?: boolean; outOfStockOnly?: boolean; wellStockedOnly?: boolean;
  isActive?: boolean; page?: number; limit?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const page  = params.page  || 1;
  const limit = params.limit || 20;
  const skip  = (page - 1) * limit;
  let where: any = { isActive: true };

  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  } else if (params.shopId) {
    where.shopId = params.shopId;
  }

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.isActive !== undefined) where.isActive = params.isActive;
  if (params.search) {
    where.OR = [
      { name:    { contains: params.search, mode: "insensitive" } },
      { sku:     { contains: params.search, mode: "insensitive" } },
      { barcode: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        supplier: { select: { id: true, name: true } },
        shop:     { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  // Apply stock filters in JS (Prisma can't compare two columns directly)
  const filtered = params.outOfStockOnly
    ? products.filter((p) => p.stockQuantity === 0)
    : params.lowStockOnly
    ? products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold)
    : params.wellStockedOnly
    ? products.filter((p) => p.stockQuantity > p.lowStockThreshold)
    : products;

  return {
    success:    true,
    data:       serializeData(filtered),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getRecentlyAddedProducts(params: { shopId?: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  let shopWhere: any = {};
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) shopWhere.shopId = userShop.shopId;
  } else if (params.shopId) {
    shopWhere.shopId = params.shopId;
  }

  try {
    const logs = await prisma.inventoryLog.findMany({
      where: {
        ...shopWhere,
        type: { in: ["INITIAL", "RESTOCK"] },
      },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
            shop:     { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const entries = logs
      .filter(log => log.product?.isActive)
      .map(log => ({
        logId:          log.id,
        logType:        log.type,
        logDate:        log.createdAt,
        quantityAdded:  log.quantityChange,
        quantityAfter:  log.quantityAfter,
        quantityBefore: log.quantityBefore,
        notes:          log.notes,
        id:             log.product?.id,
        name:           log.product?.name,
        sku:            log.product?.sku,
        image:          log.product?.image,
        costPrice:      log.product?.costPrice,
        stockQuantity:  log.product?.stockQuantity,
        category:       log.product?.category,
        shop:           log.product?.shop,
        addedBy:        log.user ? { id: log.user.id, name: log.user.name } : null,
        createdAt:      log.createdAt,
      }));

    return { success: true, data: serializeData(entries) };
  } catch (e: any) {
    console.error("getRecentlyAddedProducts error:", e.message);
    return { success: false, data: [] };
  }
}

export async function getLowStockProducts(shopId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  let where: any = { isActive: true };

  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  } else if (shopId) {
    where.shopId = shopId;
  }

  const allProducts = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      shop:     { select: { id: true, name: true } },
    },
    orderBy: { stockQuantity: "asc" },
  });

  const lowStock = allProducts
    .filter((p) => p.stockQuantity <= p.lowStockThreshold)
    .sort((a, b) =>
      (a.stockQuantity / Math.max(a.lowStockThreshold, 1)) -
      (b.stockQuantity / Math.max(b.lowStockThreshold, 1))
    );

  return { success: true, data: serializeData(lowStock) };
}

export async function getProductById(productId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      supplier: true,
      shop:     true,
      saleItems: {
        include: { sale: { select: { orderCode: true, createdAt: true, buyerType: true } } },
        orderBy: { sale: { createdAt: "desc" } },
        take: 10,
      },
      inventoryLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      damagedProducts: {
        include: { reportedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      restockHistory: {
        orderBy: { restockedAt: "desc" },
        take: 10,
      },
    },
  });

  return { success: true, data: serializeData(product) };
}

export async function deleteProduct(productId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") throw new Error("Only Root Super Admin can delete products");

  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  revalidatePath("/dashboard/inventory");
  return { success: true };
}
