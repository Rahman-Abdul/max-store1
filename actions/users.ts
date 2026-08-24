"use server";
import { serializeData } from "@/lib/utils";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";

// Only Root Super Admin can manage users
async function requireRootAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    throw new Error("Only Root Super Admin can manage user accounts");
  }
  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  shopIds: string[];
  phone?: string;
}) {
  const admin = await requireRootAdmin();

  // Check if email/username already exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });
  if (existing) throw new Error("Email or username already exists");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username,
        password: hashedPassword,
        role: data.role,
        phone: data.phone,
        createdBy: admin.id,
      },
    });

    // Assign shops
    if (data.shopIds.length > 0) {
      await tx.userShop.createMany({
        data: data.shopIds.map((shopId) => ({
          userId: newUser.id,
          shopId,
        })),
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE",
        entityType: "User",
        entityId: newUser.id,
        newData: { name: data.name, email: data.email, role: data.role },
      },
    });

    return newUser;
  });

  revalidatePath("/dashboard/staff");
  return { success: true, data: serializeData({ id: user.id, name: user.name, email: user.email }) };
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    shopIds?: string[];
  }
) {
  const admin = await requireRootAdmin();

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
      },
    });

    // Update shop assignments
    if (data.shopIds !== undefined) {
      await tx.userShop.deleteMany({ where: { userId } });
      if (data.shopIds.length > 0) {
        await tx.userShop.createMany({
          data: data.shopIds.map((shopId) => ({ userId, shopId })),
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        oldData: { name: existing.name, email: existing.email },
        newData: data,
      },
    });
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function resetPassword(userId: string, newPassword: string) {
  const admin = await requireRootAdmin();

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { password: hashedPassword, failedLoginCount: 0 },
    });

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  return { success: true, message: "Password reset successfully" };
}

export async function suspendUser(userId: string, reason?: string) {
  const admin = await requireRootAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role === "ROOT_SUPER_ADMIN") throw new Error("Cannot suspend root admin");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "ACCOUNT_SUSPEND",
        entityType: "User",
        entityId: userId,
        newData: { reason },
      },
    });
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function activateUser(userId: string) {
  const admin = await requireRootAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE, failedLoginCount: 0 },
    });

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "ACCOUNT_ACTIVATE",
        entityType: "User",
        entityId: userId,
      },
    });
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function assignRole(userId: string, role: UserRole) {
  const admin = await requireRootAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role },
    });

    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "ROLE_ASSIGN",
        entityType: "User",
        entityId: userId,
        oldData: { role: user.role },
        newData: { role },
      },
    });
  });

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function getUsers(params: {
  role?: UserRole;
  status?: UserStatus;
  shopId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (user.role !== "ROOT_SUPER_ADMIN") {
    throw new Error("Insufficient permissions");
  }

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  let where: any = {};
  if (params.role) where.role = params.role;
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
      { username: { contains: params.search, mode: "insensitive" } },
    ];
  }
  if (params.shopId) {
    where.shopAssignments = { some: { shopId: params.shopId } };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        shopAssignments: { include: { shop: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  // Remove passwords from response
  const sanitized = users.map(({ password, ...u }) => u);

  return {
    success: true,
    data: sanitized,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserById(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      shopAssignments: { include: { shop: true } },
      sales: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { shop: true },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) throw new Error("User not found");
  const { password, ...sanitized } = user;

  return { success: true, data: serializeData(sanitized ) };
}
