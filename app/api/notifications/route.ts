import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = session.user as { id: string };

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const where = {
    userId: user.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
    },
  });

  return NextResponse.json({
    success: true,
    data: notifications,
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = session.user as { id: string };

  const body = await request.json();
  const { id, markAllRead } = body;

  // Mark all notifications as read
  if (markAllRead) {
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  }

  // Mark single notification as read
  if (id) {
    await prisma.notification.updateMany({
      where: {
        id,
        userId: user.id, // extra safety so users can't update others' notifications
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: "Invalid request" },
    { status: 400 }
  );
}
