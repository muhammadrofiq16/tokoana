"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Plus,
  X,
  CheckCircle2,
  Database,
  PackagePlus,
} from "lucide-react";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  unit: string;
  stock: number;
}

interface StockMovementItem {
  id: number;
  productId: number;
  type: string;
  quantity: number;
  unit: string;
  sourceCategory: string;
  notes?: string | null;
  userName: string;
  createdAt: string;
  product?: {
    name: string;
    sku: string;
  } | null;
}

interface StockClientProps {
  initialMovements: StockMovementItem[];
  products: ProductOption[];
  metrics: {
    todayIn: number;
    todayOut: number;
    todayDamaged: number;
  };
}

export default function StockClient({
  initialMovements,
  products,
  metrics,
}: StockClientProps) {
  const router = useRouter();

  const [movements, setMovements] = useState<StockMovementItem[]>(initialMovements);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  // Modal State for manual input
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 0);
  const [type, setType] = useState<"in" | "out" | "damaged" | "return">("in");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [unit, setUnit] = useState<string>(products[0]?.unit || "Pcs");
  const [sourceCategory, setSourceCategory] = useState("Supplier");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync unit when product changes
  const handleProductChange = (id: number) => {
    setSelectedProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) setUnit(prod.unit);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = typeof quantity === "number" ? quantity : 1;
    if (qty <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/stok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          type,
          quantity: qty,
          unit,
          sourceCategory,
          notes,
        }),
      });

      if (res.ok) {
        const newMov = await res.json();
        setMovements([newMov, ...movements]);
        setShowAddModal(false);
        setSuccessMsg("Pergerakan stok berhasil dicatat.");
        setTimeout(() => setSuccessMsg(null), 4000);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list
  const filteredMovements = movements.filter((m) => {
    if (filter === "in") return m.type === "in" || m.type === "return";
    if (filter === "out") return m.type === "out" || m.type === "damaged";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Flash Success Message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>LOGISTIK TOKO</span>
            <span>•</span>
            <span className="text-brand-600 font-semibold">Pembaruan Realtime</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Catat Stok Masuk
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Input pergerakan barang masuk dari supplier secara ringkas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Button Buka Form Tambah */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-dark hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Stok Baru</span>
          </button>

          {/* Mode Label */}
          <div className="hidden md:flex bg-emerald-50 border border-emerald-200 p-1 rounded-xl items-center gap-1 text-xs font-semibold text-emerald-800">
            <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 bg-white shadow-xs">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Stok Masuk (Restock)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation: Master Data Barang vs Catat Stok Masuk */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex items-center border-b border-slate-200/80 px-5 pt-1">
          <Link
            href="/products"
            className="px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            <Database className="w-4 h-4" />
            <span>Master Data Barang</span>
          </Link>
          <Link
            href="/stok"
            className="px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 border-brand-600 text-brand-800"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Catat Stok Masuk</span>
          </Link>
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Masuk Hari Ini */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Masuk Hari Ini</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
              +{metrics.todayIn} Dus / Pcs
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Keluar / Penjualan */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Keluar / Penjualan</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
              -{metrics.todayOut} Unit
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Barang Rusak / Kadaluarsa */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Barang Rusak / Kadaluarsa</p>
            <h3 className="text-2xl font-black text-red-600 mt-1 tracking-tight">
              {metrics.todayDamaged} Item
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section: Riwayat Catatan */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        {/* Table Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Riwayat Catatan Mutasi Stok</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Log aktivitas pergudangan dan mutasi stok realtime
            </p>
          </div>

          {/* Filter Pills */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold text-slate-600 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Semua ({movements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("in")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === "in" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setFilter("out")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filter === "out" ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
              }`}
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 font-semibold w-24">WAKTU</th>
                <th className="py-3 font-semibold">NAMA BARANG &amp; SPESIFIKASI</th>
                <th className="py-3 font-semibold">KATEGORI / SUMBER</th>
                <th className="py-3 text-center font-semibold">PERUBAHAN STOK</th>
                <th className="py-3 text-right font-semibold">PETUGAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Belum ada riwayat pergerakan stok untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.type === "in" || m.type === "return";
                  const changeText = `${isPositive ? "+" : "-"}${m.quantity} ${m.unit}`;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 font-medium text-slate-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        }).format(new Date(m.createdAt))}
                      </td>
                      <td className="py-4">
                        <p className="font-bold text-slate-900 text-sm">
                          {m.product?.name || "Produk"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          SKU: {m.product?.sku || "-"} • {m.notes || "Pembaruan Stok"}
                        </p>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                            m.type === "damaged"
                              ? "bg-red-100 text-red-700"
                              : m.type === "return"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {m.sourceCategory}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${
                            m.type === "in"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.type === "damaged"
                              ? "bg-red-100 text-red-800"
                              : m.type === "return"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {changeText}
                        </span>
                      </td>
                      <td className="py-4 text-right font-semibold text-slate-700">
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{m.userName}</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Stok Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Catat Pergerakan Stok</h3>
                  <p className="text-xs text-slate-500">Pilih barang dan jumlah mutasi stok</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Produk / Barang
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Sisa Stok: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jenis Pergerakan
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "in" | "out" | "damaged" | "return")}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="in">Stok Masuk (Restock / Pembelian)</option>
                    <option value="out">Stok Keluar Manual</option>
                    <option value="damaged">Barang Rusak / Kadaluarsa</option>
                    <option value="return">Retur dari Pelanggan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jumlah ({unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sumber / Supplier / Kategori
                </label>
                <input
                  type="text"
                  value={sourceCategory}
                  onChange={(e) => setSourceCategory(e.target.value)}
                  placeholder="Misal: PT Wings Surya, Distributor Sembako, dsb."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan / No. Faktur (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No Faktur: INV-2026/01/99 atau alasan mutasi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-dark hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
