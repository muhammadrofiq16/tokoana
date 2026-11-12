import Link from "next/link";
import {
  Package,
  Wallet,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Truck,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatRupiah, formatNumber } from "@/lib/utils";

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
    const day = now.getDay() || 7; // Get Monday
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
    periodLabel = "Semua Waktu";
  }

  // 1. Fetch total products and stock units
  const products = await prisma.product.findMany({
    include: {
      units: {
        include: { priceTier: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const criticalProducts = products.filter((p) => p.stock <= p.minStock);
  const criticalProductsCount = criticalProducts.length;

  // 2. Inventory Asset Value (Admin only)
  const inventoryValue = isAdmin
    ? products.reduce((acc, p) => acc + p.stock * Number(p.costPrice), 0)
    : 0;

  // 3. Transactions & Sales for the period
  const transWhere: Record<string, unknown> = { status: "success" };
  if (startDate && endDate) {
    transWhere.createdAt = { gte: startDate, lte: endDate };
  }

  const transactions = await prisma.transaction.findMany({
    where: transWhere,
  });

  const salesValue = transactions.reduce((acc, t) => acc + Number(t.totalAmount), 0);
  const transactionsCount = transactions.length;

  // 4. Expenses / Supplier Purchases from StockMovements (type = 'in')
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

  const netProfit = salesValue - expenseValue;

  // 5. Restock priority list (lowest stock first)
  const restockProducts = criticalProducts
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const periods = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Pekan Ini" },
    { key: "month", label: "Bulan Ini" },
    { key: "all", label: "Semua Waktu" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Ringkasan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pantau arus transaksi, stok barang, dan kinerja penjualan toko secara real-time.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          {periods.map((p) => (
            <Link
              key={p.key}
              href={`/dashboard?period=${p.key}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === p.key
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset Penjualan */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Omset Penjualan ({periodLabel})
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{formatRupiah(salesValue)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{transactionsCount}</span> transaksi berhasil
            </p>
          </div>
        </div>

        {/* Pengeluaran Pembelian Suplier */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Belanja Suplier ({periodLabel})
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-800">{formatRupiah(expenseValue)}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Total modal stok masuk dicatat
              </p>
            </div>
          </div>
        )}

        {/* Laba Bersih / Arus Kas */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Laba Bersih ({periodLabel})
              </span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                netProfit >= 0
                  ? "bg-teal-50 text-teal-600 border-teal-100"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              }`}>
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className={`text-2xl font-black ${netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatRupiah(netProfit)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Selisih omset dan belanja stok
              </p>
            </div>
          </div>
        )}

        {/* Total Stok Fisik Unit */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Stok Unit
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{formatNumber(totalStockUnits)} <span className="text-sm font-normal text-slate-500">Unit</span></h3>
            <p className="text-xs text-slate-500 mt-1">
              Dari {products.length} varian produk terdaftar
            </p>
          </div>
        </div>

        {/* Modal Aset Inventaris (Admin) */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Nilai Aset Toko (Modal)
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-800">{formatRupiah(inventoryValue)}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Kalkulasi stok x harga pokok modal
              </p>
            </div>
          </div>
        )}

        {/* Peringatan Stok Kritis */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Perlu Restock Segera
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-700">{criticalProductsCount} <span className="text-sm font-normal text-slate-500">Produk</span></h3>
            <p className="text-xs text-slate-500 mt-1">
              Stok di bawah batas minimum
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action POS Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Kasir Siap Melayani
          </span>
          <h2 className="text-xl md:text-2xl font-black">Buka Layanan Kasir Point of Sale (POS)</h2>
          <p className="text-emerald-100 text-xs md:text-sm mt-1 max-w-xl">
            Input transaksi penjualan eceran dan grosir, pilih multi-satuan (Pcs, Dus), barcode scanner, serta cetak struk pembayaran langsung.
          </p>
        </div>
        <Link
          href="/kasir"
          className="px-6 py-3.5 rounded-2xl bg-white text-emerald-800 font-bold text-sm flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-md shrink-0"
        >
          <span>Mulai Transaksi Kasir</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Restock Priority Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">Barang Prioritas Restock</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daftar produk yang stoknya sudah menipis atau habis.</p>
          </div>
          <Link
            href="/stok"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Catat Stok Masuk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {restockProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            🎉 Semua stok barang dalam kondisi aman di atas batas minimum.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Nama Barang & SKU</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5">Sisa Stok</th>
                  <th className="px-6 py-3.5">Batas Minimal</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Suplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {restockProducts.map((p) => {
                  const isHabis = p.stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-slate-400 text-[11px] font-mono mt-0.5">{p.sku}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-black text-sm ${isHabis ? "text-rose-600" : "text-amber-600"}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                            isHabis
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isHabis ? "bg-rose-500" : "bg-amber-500"}`}></span>
                          {isHabis ? "Stok Habis" : "Menipis"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {p.supplierName || "Suplier Umum"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
