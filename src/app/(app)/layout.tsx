import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch notification data on the server
  let lowStockProducts: Array<{
    id: number;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
  }> = [];

  let expiringProducts: Array<{
    id: number;
    name: string;
    stock: number;
    unit: string;
    expiryDate: string | null;
  }> = [];

  try {
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        minStock: true,
        unit: true,
        expiryDate: true,
      },
      orderBy: { stock: "asc" },
    });

    // Low stock: stock <= minStock (column-to-column comparison done in JS)
    lowStockProducts = allProducts
      .filter((p) => p.stock <= p.minStock)
      .slice(0, 10);

    // Expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    expiringProducts = allProducts
      .filter(
        (p) => p.expiryDate && new Date(p.expiryDate) <= thirtyDaysFromNow
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        unit: p.unit,
        expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
      }))
      .slice(0, 10);
  } catch (e) {
    console.error("Error fetching notification products:", e);
  }

  return (
    <AppShell
      user={user}
      lowStockProducts={lowStockProducts}
      expiringProducts={expiringProducts}
    >
      {children}
    </AppShell>
  );
}
