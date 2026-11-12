import prisma from "@/lib/prisma";
import TransactionsClient from "./TransactionsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    period?: string;
    search?: string;
    payment?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const {
    tab = "semua",
    period = "today",
    search = "",
    payment = "all",
    status = "all",
    date_from,
    date_to,
  } = await searchParams;

  // Determine date boundaries
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === "week") {
    const day = now.getDay() || 7;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === "custom") {
    if (date_from) startDate = new Date(`${date_from}T00:00:00`);
    if (date_to) endDate = new Date(`${date_to}T23:59:59`);
  }

  // 1. Transactions (Income)
  const transWhere: any = {};
  if (startDate && endDate) {
    transWhere.createdAt = { gte: startDate, lte: endDate };
  }
  if (payment && payment !== "all") {
    transWhere.paymentMethod = { equals: payment, mode: "insensitive" };
  }
  if (status && status !== "all") {
    transWhere.status = status;
  }
  if (search) {
    transWhere.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { cashierName: { contains: search, mode: "insensitive" } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where: transWhere,
    include: {
      items: true,
      customer: true,
    },
    orderBy: { id: "desc" },
  });

  // 2. Stock Movements where type = 'in' (Expenses)
  const expenseWhere: any = { type: "in" };
  if (startDate && endDate) {
    expenseWhere.createdAt = { gte: startDate, lte: endDate };
  }
  if (search) {
    expenseWhere.OR = [
      { sourceCategory: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { userName: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const expenseMovements = await prisma.stockMovement.findMany({
    where: expenseWhere,
    include: { product: true },
    orderBy: { id: "desc" },
  });

  // Calculate totals
  const periodIncome = transactions
    .filter((t) => t.status === "success")
    .reduce((a, b) => a + Number(b.totalAmount), 0);

  const periodExpense = expenseMovements.reduce(
    (a, b) => a + b.quantity * Number(b.product?.costPrice || 0),
    0
  );

  const netBalance = periodIncome - periodExpense;
  const marginPercent =
    periodIncome > 0
      ? Math.round((netBalance / periodIncome) * 100 * 10) / 10
      : periodExpense > 0
      ? -100
      : 0;

  // Supplier breakdown
  const supplierMap = new Map<
    string,
    { name: string; itemsCount: number; totalQty: number; totalAmount: number; latestDate: Date }
  >();

  for (const m of expenseMovements) {
    const rawName = m.sourceCategory.replace(/^Supplier:\s*/i, "").trim() || "Suplier Direct";
    const amount = m.quantity * Number(m.product?.costPrice || 0);

    const existing = supplierMap.get(rawName);
    if (existing) {
      existing.itemsCount += 1;
      existing.totalQty += m.quantity;
      existing.totalAmount += amount;
      if (new Date(m.createdAt) > existing.latestDate) {
        existing.latestDate = new Date(m.createdAt);
      }
    } else {
      supplierMap.set(rawName, {
        name: rawName,
        itemsCount: 1,
        totalQty: m.quantity,
        totalAmount: amount,
        latestDate: new Date(m.createdAt),
      });
    }
  }

  const supplierBreakdown = Array.from(supplierMap.values()).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  return (
    <TransactionsClient
      transactions={JSON.parse(JSON.stringify(transactions))}
      expenseMovements={JSON.parse(JSON.stringify(expenseMovements))}
      supplierBreakdown={JSON.parse(JSON.stringify(supplierBreakdown))}
      summary={{
        periodIncome,
        periodIncomeCount: transactions.length,
        periodExpense,
        periodExpenseCount: expenseMovements.length,
        netBalance,
        marginPercent,
      }}
      currentTab={tab}
      currentPeriod={period}
      initialSearch={search}
    />
  );
}
