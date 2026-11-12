import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import CashierClient from "./CashierClient";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  const user = await getCurrentUser();

  const products = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    include: {
      units: {
        include: { priceTier: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const initialCustomers = await prisma.customer.findMany({
    take: 15,
    orderBy: { name: "asc" },
  });

  return (
    <CashierClient
      user={{
        name: user?.name || "Kasir",
        role: user?.role || "kasir",
      }}
      initialProducts={JSON.parse(JSON.stringify(products))}
      categories={categories}
      initialCustomers={JSON.parse(JSON.stringify(initialCustomers))}
    />
  );
}
