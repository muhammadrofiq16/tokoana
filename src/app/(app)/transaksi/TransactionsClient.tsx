"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Search,
  Building,
  Calendar,
  ExternalLink,
  ChevronRight,
  Truck,
  Wallet,
  Sparkles,
  PieChart,
} from "lucide-react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";

interface TransactionItem {
  id: number;
  invoiceNumber: string;
  paymentMethod: string;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  cashierName: string;
  customerName?: string | null;
  saleMode: string;
  status: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
  }>;
  customer?: {
    type: string;
  } | null;
}

interface ExpenseMovementItem {
  id: number;
  quantity: number;
  unit: string;
  sourceCategory: string;
  notes?: string | null;
  userName: string;
  createdAt: string;
  product?: {
    name: string;
    costPrice: number;
  } | null;
}

interface SupplierSummary {
  name: string;
  itemsCount: number;
  totalQty: number;
  totalAmount: number;
  latestDate: string;
}

interface TransactionsClientProps {
  transactions: TransactionItem[];
  expenseMovements: ExpenseMovementItem[];
  supplierBreakdown: SupplierSummary[];
  summary: {
    periodIncome: number;
    periodIncomeCount: number;
    periodExpense: number;
    periodExpenseCount: number;
    netBalance: number;
    marginPercent: number;
  };
  currentTab: string;
  currentPeriod: string;
  initialSearch: string;
}

export default function TransactionsClient({
  transactions,
  expenseMovements,
  supplierBreakdown,
  summary,
  currentTab,
  currentPeriod,
  initialSearch,
}: TransactionsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState(currentTab);
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState(initialSearch);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    router.push(`/transaksi?tab=${tab}&period=${newPeriod}&search=${encodeURIComponent(search)}`);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    router.push(`/transaksi?tab=${newTab}&period=${period}&search=${encodeURIComponent(search)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/transaksi?tab=${tab}&period=${period}&search=${encodeURIComponent(search)}`);
  };

  // Build combined list
  const combinedList: Array<{
    id: string;
    type: "income" | "expense";
    refNumber: string;
    date: string;
    partyName: string;
    partyType: string;
    description: string;
    paymentMethod: string;
    amount: number;
    user: string;
    link?: string;
  }> = [];

  if (tab === "semua" || tab === "pemasukan") {
    for (const t of transactions) {
      const desc =
        t.items.map((i) => i.productName).slice(0, 2).join(", ") +
        (t.items.length > 2 ? ` (+${t.items.length - 2} item)` : "");

      combinedList.push({
        id: `trans-${t.id}`,
        type: "income",
        refNumber: t.invoiceNumber,
        date: t.createdAt,
        partyName: t.customerName || "Pelanggan Umum",
        partyType: t.customer?.type === "reseller" ? "Reseller" : "Retail",
        description: desc || "Penjualan Kasir",
        paymentMethod: t.paymentMethod,
        amount: Number(t.totalAmount),
        user: t.cashierName,
        link: `/transaksi/${t.id}`,
      });
    }
  }

  if (tab === "semua" || tab === "pengeluaran") {
    for (const sm of expenseMovements) {
      const supplierName = sm.sourceCategory.replace(/^Supplier:\s*/i, "").trim() || "Suplier Direct";
      const cost = sm.quantity * Number(sm.product?.costPrice || 0);

      combinedList.push({
        id: `sm-${sm.id}`,
        type: "expense",
        refNumber: sm.notes?.match(/Faktur:\s*([^•\s]+)/i)?.[1] || `FKT-${sm.id}`,
        date: sm.createdAt,
        partyName: supplierName,
        partyType: "Suplier",
        description: `${sm.product?.name || "Barang"} (${sm.quantity} ${sm.unit})`,
        paymentMethod: "Faktur Suplier",
        amount: cost,
        user: sm.userName,
        link: "/stok",
      });
    }
  }

  // Sort descending by date
  combinedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const periods = [
    { key: "today", label: "Hari Ini" },
    { key: "week", label: "Pekan Ini" },
    { key: "month", label: "Bulan Ini" },
    { key: "all", label: "Semua" },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Riwayat Keuangan & Laporan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekap transaksi penjualan kasir, belanja stok suplier, dan analisis laba bersih.
          </p>
        </div>

        {/* Period Pills */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs self-start sm:self-auto">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                period === p.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Omset Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-900">
              {formatRupiah(summary.periodIncome)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary.periodIncomeCount} transaksi penjualan
            </p>
          </div>
        </div>

        {/* Belanja Suplier */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Belanja Stok Suplier
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600">
              {formatRupiah(summary.periodExpense)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary.periodExpenseCount} faktur barang masuk
            </p>
          </div>
        </div>

        {/* Saldo Arus Kas Bersih */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Arus Kas / Laba Bersih
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                summary.netBalance >= 0
                  ? "bg-teal-50 text-teal-600 border-teal-100"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3
              className={`text-2xl font-black ${
                summary.netBalance >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {formatRupiah(summary.netBalance)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Selisih pemasukan - pengeluaran</p>
          </div>
        </div>

        {/* Margin Persentase */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Margin Keuntungan
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-purple-700">
              {summary.marginPercent > 0 ? `+${summary.marginPercent}%` : `${summary.marginPercent}%`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Dari rasio laba terhadap omset</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => handleTabChange("semua")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              tab === "semua"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Semua Arus Kas
          </button>
          <button
            onClick={() => handleTabChange("pemasukan")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              tab === "pemasukan"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Pemasukan (Penjualan)
          </button>
          <button
            onClick={() => handleTabChange("pengeluaran")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              tab === "pengeluaran"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Pengeluaran (Suplier)
          </button>
          <button
            onClick={() => handleTabChange("laporan")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              tab === "laporan"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Laporan Finansial
          </button>
        </div>

        {tab !== "laporan" && (
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no nota, suplier, kasir..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
          </form>
        )}
      </div>

      {/* Main Content Area based on Tab */}
      {tab === "laporan" ? (
        /* Report View: Supplier Breakdown */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                <span>Rincian Pembelian per Distributor / Suplier</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Akumulasi belanja stok dan frekuensi pengiriman faktur distributor.
              </p>
            </div>

            {supplierBreakdown.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada transaksi belanja suplier pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Nama Distributor / Suplier</th>
                      <th className="px-6 py-4">Jumlah Transaksi</th>
                      <th className="px-6 py-4">Total Unit Barang</th>
                      <th className="px-6 py-4">Total Pengeluaran</th>
                      <th className="px-6 py-4">Faktur Terakhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {supplierBreakdown.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {s.itemsCount} kali
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {s.totalQty} Unit
                        </td>
                        <td className="px-6 py-4 font-black text-rose-600 text-sm">
                          {formatRupiah(s.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDate(s.latestDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Transaction History Table */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {combinedList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Tidak ada riwayat transaksi</p>
              <p className="text-xs text-slate-400 mt-1">
                Lakukan transaksi kasir atau catat belanja suplier untuk mengisi catatan arus kas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">No. Referensi & Tanggal</th>
                    <th className="px-6 py-4">Tipe & Pihak</th>
                    <th className="px-6 py-4">Keterangan / Rincian</th>
                    <th className="px-6 py-4">Metode Bayar</th>
                    <th className="px-6 py-4">Nominal</th>
                    <th className="px-6 py-4">Petugas</th>
                    <th className="px-6 py-4 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {combinedList.map((item) => {
                    const isIncome = item.type === "income";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-slate-900 block text-xs">
                            {item.refNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {formatDate(item.date)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isIncome
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {isIncome ? "Masuk" : "Keluar"}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {item.partyName}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {item.partyType}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-600 max-w-xs truncate">
                          {item.description}
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {item.paymentMethod}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`font-black text-sm ${
                              isIncome ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {isIncome ? "+" : "-"} {formatRupiah(item.amount)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {item.user}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {item.link && (
                            <Link
                              href={item.link}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
