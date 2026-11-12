import prisma from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      units: {
        include: { priceTier: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  return (
    <ProductsClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      categories={categories}
    />
  );
}
