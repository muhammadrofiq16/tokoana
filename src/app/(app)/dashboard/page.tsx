import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Box,
  ShieldCheck,
  PackagePlus,
  ArrowRight,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const { period = "today" } = await searchParams;

  // Determine date boundaries
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let periodLabel = "Hari Ini";

  if (period === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    periodLabel = "Hari Ini";
  } else if (period === "week") {
    const day = now.getDay() || 7;
    startDate = new Date(now);
    startDate.setDate(now.getDate() - day + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    periodLabel = "Pekan Ini";
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = "Bulan Ini";
  } else if (period === "all") {
    startDate = null;
    endDate = null;
    periodLabel = "Semua";
  }

  // 1. Products & Stock
  const products = await prisma.product.findMany({
    include: {
      units: {
        include: { priceTier: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { stock: "asc" },
  });

  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const criticalProducts = products.filter((p) => p.stock <= p.minStock);
  const criticalProductsCount = criticalProducts.length;

  // 2. Inventory Value (Admin only)
  const inventoryValue = isAdmin
    ? products.reduce((acc, p) => acc + p.stock * Number(p.costPrice), 0)
    : 0;

  // 3. Transactions & Sales for the period
  const transWhere: Record<string, unknown> = { status: "success" };
  if (startDate && endDate) {
    transWhere.createdAt = { gte: startDate, lte: endDate };
  }

  const [transactions, recentTransactions] = await Promise.all([
    prisma.transaction.findMany({ where: transWhere }),
    prisma.transaction.findMany({
      take: 6,
      orderBy: { id: "desc" },
      include: { customer: true },
    }),
  ]);

  const salesValue = transactions.reduce((acc, t) => acc + Number(t.totalAmount), 0);
  const transactionsCount = transactions.length;

  // 4. Expenses (Supplier restocks)
  const expenseWhere: Record<string, unknown> = { type: "in" };
  if (startDate && endDate) {
    expenseWhere.createdAt = { gte: startDate, lte: endDate };
  }

  const expenseMovements = await prisma.stockMovement.findMany({
    where: expenseWhere,
    include: { product: true },
  });

  const expenseValue = expenseMovements.reduce(
    (acc, m) => acc + m.quantity * Number(m.product?.costPrice || 0),
    0
  );

  // Top 5 restock priority products
  const restockPriority = criticalProducts.slice(0, 5);

  const nowFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header & Period Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Toko</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Operasional Normal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">{nowFormatted}</p>
        </div>

        {/* Period Toggle Buttons */}
        <div className="bg-brand-50 border border-brand-200/50 p-1 rounded-xl flex items-center overflow-x-auto whitespace-nowrap gap-1 text-xs font-semibold text-slate-600">
          <Link
            href="/dashboard?period=today"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === "today"
                ? "bg-white text-brand-800 shadow-xs border border-brand-200/60 font-bold"
                : "hover:text-brand-800"
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href="/dashboard?period=week"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === "week"
                ? "bg-white text-brand-800 shadow-xs border border-brand-200/60 font-bold"
                : "hover:text-brand-800"
            }`}
          >
            Pekan Ini
          </Link>
          <Link
            href="/dashboard?period=month"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === "month"
                ? "bg-white text-brand-800 shadow-xs border border-brand-200/60 font-bold"
                : "hover:text-brand-800"
            }`}
          >
            Bulan Ini
          </Link>
          <Link
            href="/dashboard?period=all"
            className={`px-3 py-1.5 rounded-lg transition-all ${
              period === "all"
                ? "bg-white text-brand-800 shadow-xs border border-brand-200/60 font-bold"
                : "hover:text-brand-800"
            }`}
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Key Summary Metric Cards (Exact match to original app) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Omzet / Penjualan (HIGHLIGHTED - Green gradient) */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 shadow-md flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-brand-100">Omzet Penjualan</span>
                <p className="text-[10px] text-brand-200 capitalize mt-0.5">
                  Periode {periodLabel}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight">
                  {formatRupiah(salesValue)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-medium text-brand-100">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <span className="font-bold text-white">{transactionsCount}</span>
                  <span>transaksi ({periodLabel.toLowerCase()})</span>
                </div>
                {isAdmin && expenseValue > 0 && (
                  <div
                    className="text-[10px] bg-white/15 px-2 py-0.5 rounded font-medium text-white/90"
                    title="Total Pembelian Suplier"
                  >
                    Beli: {formatRupiah(expenseValue)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Stok Menipis (HIGHLIGHTED - Amber/Warning) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/50 rounded-full -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-amber-700">Stok Menipis</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200/60 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-amber-800 tracking-tight">
                  {criticalProductsCount}
                </span>
                <span className="text-xs font-semibold text-amber-600">produk kritis</span>
              </div>
              <div className="mt-2">
                {criticalProductsCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-200/60 text-amber-800 text-[11px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    Perlu PO segera
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Semua stok aman
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Stok & Nilai Persediaan */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Stok &amp; Persediaan</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200/40 flex items-center justify-center">
              <Box className="w-4 h-4 text-brand-600" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {totalStockUnits.toLocaleString("id-ID")}
                </span>
                <span className="text-xs font-semibold text-slate-500">unit</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total stok fisik</p>
            </div>
            {isAdmin ? (
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-brand-700">
                    Rp {(inventoryValue / 1000000).toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Juta</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Estimasi nilai persediaan
                </p>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Akses Kasir</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Mode operasional POS aktif
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barang Prioritas Restock Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Barang Prioritas Restock</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Item dengan stok berada di bawah batas minimum keamanan
            </p>
          </div>
          <Link
            href="/stok"
            className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            <span>Catat Stok Masuk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {restockPriority.length === 0 ? (
          <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold">Semua persediaan barang dalam batas aman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 font-semibold">KODE SKU</th>
                  <th className="py-3 font-semibold">NAMA BARANG</th>
                  <th className="py-3 font-semibold">KATEGORI</th>
                  <th className="py-3 font-semibold text-center">SISA STOK</th>
                  <th className="py-3 font-semibold text-center">MIN STOK</th>
                  <th className="py-3 font-semibold text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restockPriority.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-3.5 font-bold text-slate-800 text-sm">{p.name}</td>
                    <td className="py-3.5 text-slate-500">{p.category}</td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                          p.stock <= 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3.5 text-center text-slate-500 font-semibold">
                      {p.minStock} {p.unit}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href="/stok"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold rounded-lg border border-brand-200 transition-all"
                      >
                        <PackagePlus className="w-3.5 h-3.5 text-brand-600" />
                        <span>Restock</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaksi Terakhir */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Transaksi Penjualan Terakhir</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Riwayat penjualan kasir yang baru saja diproses
            </p>
          </div>
          <Link
            href="/transaksi"
            className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            <span>Lihat Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-medium">Belum ada transaksi penjualan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 font-semibold">INVOICE</th>
                  <th className="py-3 font-semibold">WAKTU</th>
                  <th className="py-3 font-semibold">PELANGGAN</th>
                  <th className="py-3 font-semibold">METODE</th>
                  <th className="py-3 font-semibold text-right">TOTAL BELANJA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-mono font-bold text-slate-800">{t.invoiceNumber}</td>
                    <td className="py-3.5 text-slate-500 whitespace-nowrap">
                      {new Intl.DateTimeFormat("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(t.createdAt))}
                    </td>
                    <td className="py-3.5 text-slate-700 font-medium">
                      {t.customer?.name || t.customerName || "Pelanggan Umum"}
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900 text-sm">
                      {formatRupiah(Number(t.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
