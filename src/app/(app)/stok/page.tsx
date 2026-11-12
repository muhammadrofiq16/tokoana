import prisma from "@/lib/prisma";
import StockClient from "./StockClient";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true },
    orderBy: { id: "desc" },
    take: 50,
  });

  const products = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, unit: true, stock: true },
    orderBy: { name: "asc" },
  });

  // Calculate today metrics
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const todayMovements = movements.filter((m) => {
    const d = new Date(m.createdAt);
    return d >= startOfToday && d <= endOfToday;
  });

  const todayIn = todayMovements
    .filter((m) => m.type === "in")
    .reduce((a, b) => a + b.quantity, 0);

  const todayOut = todayMovements
    .filter((m) => m.type === "out" || m.type === "sale")
    .reduce((a, b) => a + b.quantity, 0);

  const todayDamaged = todayMovements
    .filter((m) => m.type === "damaged" || m.type === "return")
    .reduce((a, b) => a + b.quantity, 0);

  return (
    <StockClient
      initialMovements={JSON.parse(JSON.stringify(movements))}
      products={JSON.parse(JSON.stringify(products))}
      metrics={{ todayIn, todayOut, todayDamaged }}
    />
  );
}
