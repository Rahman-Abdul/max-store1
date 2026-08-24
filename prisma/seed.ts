import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use DIRECT_URL for seeding — bypasses Supabase transaction pooler
// which times out on sequential operations
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🌱 Seeding database...");

  // Create Root Super Admin
  const hashedPassword = await bcrypt.hash("SuperAdmin@12345", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@posystem.com" },
    update: {},
    create: {
      name: "Root Super Admin",
      email: "superadmin@posystem.com",
      username: "superadmin",
      password: hashedPassword,
      role: UserRole.ROOT_SUPER_ADMIN,
    },
  });

  console.log("✅ Root Super Admin created:", superAdmin.email);

  // Create currencies
  const currencies = [
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", isBase: true },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }

  console.log("✅ Currencies seeded");

  // Create expense categories
  const expenseCategories = [
    { name: "Salary", icon: "users" },
    { name: "Fuel", icon: "fuel" },
    { name: "Rent", icon: "building" },
    { name: "Transport", icon: "truck" },
    { name: "Maintenance", icon: "wrench" },
    { name: "Utility Bills", icon: "zap" },
    { name: "Miscellaneous", icon: "more-horizontal" },
  ];

  for (const cat of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log("✅ Expense categories seeded");

  // Create a demo shop
  const demoShop = await prisma.shop.upsert({
    where: { slug: "demo-shop" },
    update: {},
    create: {
      name: "Demo Electronics Store",
      slug: "demo-shop",
      description: "Demo shop for testing",
      address: "123 Business District, Lagos, Nigeria",
      phone: "+234 800 000 0000",
      email: "demo@posystem.com",
      currency: "NGN",
      plan: "enterprise",
    },
  });

  console.log("✅ Demo shop created:", demoShop.name);

  // Create Shop Admin
  const shopAdminPassword = await bcrypt.hash("ShopAdmin@12345", 12);
  const shopAdmin = await prisma.user.upsert({
    where: { email: "shopadmin@posystem.com" },
    update: {},
    create: {
      name: "Shop Admin",
      email: "shopadmin@posystem.com",
      username: "shopadmin",
      password: shopAdminPassword,
      role: UserRole.SHOP_ADMIN,
      createdBy: superAdmin.id,
    },
  });

  await prisma.userShop.upsert({
    where: { userId_shopId: { userId: shopAdmin.id, shopId: demoShop.id } },
    update: {},
    create: { userId: shopAdmin.id, shopId: demoShop.id },
  });

  // Create Staff
  const staffPassword = await bcrypt.hash("Staff@12345", 12);
  const staff = await prisma.user.upsert({
    where: { email: "staff@posystem.com" },
    update: {},
    create: {
      name: "Sales Staff",
      email: "staff@posystem.com",
      username: "staff01",
      password: staffPassword,
      role: UserRole.STAFF,
      createdBy: superAdmin.id,
    },
  });

  await prisma.userShop.upsert({
    where: { userId_shopId: { userId: staff.id, shopId: demoShop.id } },
    update: {},
    create: { userId: staff.id, shopId: demoShop.id },
  });

  // Create Cashier
  const cashierPassword = await bcrypt.hash("Cashier@12345", 12);
  const cashier = await prisma.user.upsert({
    where: { email: "cashier@posystem.com" },
    update: {},
    create: {
      name: "Cashier",
      email: "cashier@posystem.com",
      username: "cashier01",
      password: cashierPassword,
      role: UserRole.CASHIER,
      createdBy: superAdmin.id,
    },
  });

  await prisma.userShop.upsert({
    where: { userId_shopId: { userId: cashier.id, shopId: demoShop.id } },
    update: {},
    create: { userId: cashier.id, shopId: demoShop.id },
  });

  console.log("✅ Users seeded");

  // Create categories
  const categories = [
    { name: "Electronics", slug: "electronics" },
    { name: "Electrical", slug: "electrical" },
    { name: "Tools", slug: "tools" },
    { name: "Accessories", slug: "accessories" },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug_shopId: { slug: cat.slug, shopId: demoShop.id } },
      update: {},
      create: { ...cat, shopId: demoShop.id },
    });
    createdCategories[cat.slug] = created.id;
  }

  // Create supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: "TechSupply Co.",
      email: "supply@techsupply.com",
      phone: "+234 800 111 2222",
      address: "Supply District, Lagos",
      contactName: "John Supplier",
    },
  });

  // Create products
  const products = [
    {
      name: "LED Bulb 9W",
      sku: "LED-001",
      barcode: "123456789001",
      costPrice: 850,
      stockQuantity: 150,
      lowStockThreshold: 20,
      categoryId: createdCategories["electrical"],
    },
    {
      name: "Circuit Breaker 16A",
      sku: "CB-001",
      barcode: "123456789002",
      costPrice: 3500,
      stockQuantity: 45,
      lowStockThreshold: 10,
      categoryId: createdCategories["electrical"],
    },
    {
      name: "Digital Multimeter",
      sku: "DM-001",
      barcode: "123456789003",
      costPrice: 8500,
      stockQuantity: 8,
      lowStockThreshold: 5,
      categoryId: createdCategories["tools"],
    },
    {
      name: "Extension Cable 5m",
      sku: "EC-001",
      barcode: "123456789004",
      costPrice: 2200,
      stockQuantity: 200,
      lowStockThreshold: 30,
      categoryId: createdCategories["electrical"],
    },
    {
      name: "USB-C Hub 7-in-1",
      sku: "USB-001",
      barcode: "123456789005",
      costPrice: 12000,
      stockQuantity: 3,
      lowStockThreshold: 5,
      categoryId: createdCategories["electronics"],
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku_shopId: { sku: product.sku, shopId: demoShop.id } },
      update: {},
      create: {
        ...product,
        shopId: demoShop.id,
        supplierId: supplier.id,
        costPrice: product.costPrice,
      },
    });
  }

  console.log("✅ Products seeded");
  console.log("\n🎉 Seeding complete!\n");
  console.log("📋 Login Credentials:");
  console.log("  Root Super Admin: superadmin@posystem.com / SuperAdmin@12345");
  console.log("  Shop Admin:       shopadmin@posystem.com / ShopAdmin@12345");
  console.log("  Staff:            staff@posystem.com / Staff@12345");
  console.log("  Cashier:          cashier@posystem.com / Cashier@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
