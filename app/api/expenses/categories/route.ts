import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DEFAULT_CATEGORIES = [
  "Salary", "Fuel", "Rent", "Transport", "Maintenance",
  "Utility Bills", "Restock", "Miscellaneous",
];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let categories = await prisma.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });

  // Seed default categories on first load if none exist yet
  if (categories.length === 0) {
    await prisma.expenseCategory.createMany({
      data: DEFAULT_CATEGORIES.map(name => ({ name })),
      skipDuplicates: true,
    });
    categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
  } else {
    // Make sure "Restock" specifically exists even if other categories were already there
    const hasRestock = categories.some(c => c.name.toLowerCase() === "restock");
    if (!hasRestock) {
      await prisma.expenseCategory.create({ data: { name: "Restock" } });
      categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    }
  }

  return NextResponse.json({ success: true, data: categories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Find existing (case-insensitive) or create new
  const existing = await prisma.expenseCategory.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
  });

  const category = existing || await prisma.expenseCategory.create({
    data: { name: name.trim() },
  });

  return NextResponse.json({ success: true, data: category });
}
