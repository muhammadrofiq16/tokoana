import prisma from "@/lib/prisma";
import CashierClient from "./CashierClient";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
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
    take: 10,
    orderBy: { name: "asc" },
  });

  return (
    <CashierClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      categories={categories}
      initialCustomers={JSON.parse(JSON.stringify(initialCustomers))}
    />
  );
}
