import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InventoryClient } from "@/components/inventory/inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await auth();
  const user = session!.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    redirect("/dashboard");
  }

  return <InventoryClient user={user} />;
}
