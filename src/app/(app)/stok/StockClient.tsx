"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PackagePlus,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  AlertOctagon,
  Clock,
  Plus,
  Building,
  User,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import InvoiceScannerModal from "@/components/stok/InvoiceScannerModal";

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
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Manual stock form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number>(products[0]?.id || 0);
  const [type, setType] = useState<"in" | "out" | "damaged" | "return">("in");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [unit, setUnit] = useState<string>(products[0]?.unit || "Pcs");
  const [sourceCategory, setSourceCategory] = useState("Supplier");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // When selected product changes, sync unit
  const handleProductSelect = (id: number) => {
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
        setShowManualForm(false);
        setNotes("");
        setQuantity(1);
        handleRefresh();
      } else {
        alert("Gagal mencatat mutasi stok.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/stok");
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
    } catch (err) {
      console.error(err);
    }
    router.refresh();
  };

  const filteredMovements = movements.filter((m) => {
    if (filter === "in") return m.type === "in";
    if (filter === "out") return m.type !== "in";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Logistik & Catatan Stok Masuk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan barang masuk dari suplier, mutasi inventaris, dan scanner faktur otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Scan Faktur AI</span>
          </button>

          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>{showManualForm ? "Tutup Form" : "Catat Manual"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Stok Masuk Hari Ini
            </span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">
              +{metrics.todayIn} <span className="text-xs font-medium text-slate-400">Unit</span>
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Stok Keluar / Terjual
            </span>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">
              -{metrics.todayOut} <span className="text-xs font-medium text-slate-400">Unit</span>
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Barang Rusak / Retur
            </span>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5">
              {metrics.todayDamaged} <span className="text-xs font-medium text-slate-400">Kasus</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Manual Entry Form Card (Collapsible) */}
      {showManualForm && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">Catat Mutasi Stok Manual</h3>
              <p className="text-xs text-slate-400">
                Gunakan untuk menambah stok dari suplier manual, penyesuaian fisik opname, atau mencatat barang rusak.
              </p>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Produk *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Sisa: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Mutasi *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="in">Stok Masuk (+)</option>
                  <option value="out">Stok Keluar (-)</option>
                  <option value="damaged">Barang Rusak (-)</option>
                  <option value="return">Retur ke Suplier (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kuantitas *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Satuan"
                    className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Sumber / Nama Suplier *
                </label>
                <input
                  type="text"
                  required
                  value={sourceCategory}
                  onChange={(e) => setSourceCategory(e.target.value)}
                  placeholder="Contoh: Supplier PT Indomarco, Gudang, Koreksi Stok..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="No faktur, kondisi barang, dll..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Catatan Stok"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Movements Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Mutasi ({movements.length})
            </button>
            <button
              onClick={() => setFilter("in")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === "in" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Hanya Stok Masuk
            </button>
            <button
              onClick={() => setFilter("out")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === "out" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Keluar & Penjualan
            </button>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PackagePlus className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Belum ada riwayat mutasi stok</p>
            <p className="text-xs text-slate-400 mt-1">
              Catat barang masuk atau scan faktur distributor untuk mengisi riwayat.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Nama Barang</th>
                  <th className="px-6 py-4">Jumlah Perubahan</th>
                  <th className="px-6 py-4">Kategori / Sumber</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredMovements.map((m) => {
                  const isIn = m.type === "in";
                  const isSale = m.type === "sale";
                  const isDamaged = m.type === "damaged" || m.type === "return";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-sm block">
                          {m.product?.name || "Produk"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {m.product?.sku}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                            isIn
                              ? "bg-emerald-100 text-emerald-800"
                              : isSale
                              ? "bg-amber-100 text-amber-800"
                              : isDamaged
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {isIn ? `+ ${m.quantity}` : `- ${m.quantity}`} {m.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {m.sourceCategory}
                      </td>

                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                        {m.notes || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {m.userName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Scanner Modal */}
      <InvoiceScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleRefresh}
        catalogProducts={products}
      />
    </div>
  );
}
