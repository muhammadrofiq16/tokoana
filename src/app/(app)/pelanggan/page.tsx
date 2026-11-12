import prisma from "@/lib/prisma";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { transactions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return <CustomersClient initialCustomers={JSON.parse(JSON.stringify(customers))} />;
}
