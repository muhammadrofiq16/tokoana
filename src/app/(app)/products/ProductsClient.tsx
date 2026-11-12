"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Barcode,
  Layers,
  Calendar,
  Database,
  PackagePlus,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import ProductModal from "@/components/products/ProductModal";

interface ProductUnit {
  id: number;
  unitName: string;
  conversionFactor: number;
  priceTier?: {
    priceRetail: number;
    priceWholesale: number;
    minWholesaleQty: number;
  };
}

interface ProductItem {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  expiryDate?: string | null;
  supplierName?: string | null;
  units: ProductUnit[];
}

interface ProductsClientProps {
  initialProducts: ProductItem[];
  categories: string[];
}

export default function ProductsClient({
  initialProducts,
  categories,
}: ProductsClientProps) {
  const router = useRouter();

  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState<"all" | "aman" | "menipis" | "habis">("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Status counts
  const totalCount = products.length;
  const amanCount = products.filter((p) => p.stock > p.minStock).length;
  const menipisCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const habisCount = products.filter((p) => p.stock <= 0).length;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "Semua Kategori" ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter === "aman") matchStatus = p.stock > p.minStock;
      else if (statusFilter === "menipis") matchStatus = p.stock > 0 && p.stock <= p.minStock;
      else if (statusFilter === "habis") matchStatus = p.stock <= 0;

      return matchCat && matchQuery && matchStatus;
    });
  }, [products, search, selectedCategory, statusFilter]);

  const handleDelete = async (product: ProductItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus barang '${product.name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        router.refresh();
      } else {
        alert("Gagal menghapus barang.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & New Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>INVENTARIS &amp; LOGISTIK</span>
            <span>•</span>
            <span className="text-brand-700 font-semibold">SISTEM TOKO</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Master Data Barang</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola data inventaris, stok, harga barang, dan pencatatan stok masuk dari supplier.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-dark hover:bg-brand-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Barang Baru</span>
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex items-center border-b border-slate-200/80 px-5 pt-1">
          <Link
            href="/products"
            className="px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 border-brand-600 text-brand-800"
          >
            <Database className="w-4 h-4" />
            <span>Data Inventaris</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">
              {totalCount}
            </span>
          </Link>
          <Link
            href="/stok"
            className="px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Catat Stok Masuk</span>
          </Link>
        </div>
      </div>

      {/* Filter and Status Summary Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter("aman")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "aman"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Stok Aman ({amanCount})
          </button>
          <button
            onClick={() => setStatusFilter("menipis")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "menipis"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Menipis ({menipisCount})
          </button>
          <button
            onClick={() => setStatusFilter("habis")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "habis"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Habis ({habisCount})
          </button>
        </div>

        {/* Search Input & Category Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-8 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama barang, kode SKU, atau barcode..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Semua Kategori">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Tidak ada barang ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Cobalah mengganti kata kunci pencarian atau menambah barang baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Kode & Barcode</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Harga Pokok (Modal)</th>
                  <th className="px-6 py-4">Satuan & Harga Jual</th>
                  <th className="px-6 py-4">Stok Fisik</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProducts.map((p) => {
                  const isHabis = p.stock <= 0;
                  const isMenipis = p.stock > 0 && p.stock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-800 text-xs block">
                          {p.sku}
                        </span>
                        {p.barcode ? (
                          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Barcode className="w-3 h-3 text-emerald-600" />
                            {p.barcode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Suplier: {p.supplierName || "Suplier Umum"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {formatRupiah(Number(p.costPrice))}
                      </td>

                      {/* Units & Pricing Breakdown */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {p.units.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 text-[11px]">
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {u.unitName}
                              </span>
                              <span className="text-emerald-700 font-extrabold">
                                {formatRupiah(Number(u.priceTier?.priceRetail || 0))}
                              </span>
                              {Number(u.priceTier?.priceWholesale || 0) > 0 && (
                                <span className="text-amber-600 text-[10px]">
                                  (Grosir: {formatRupiah(Number(u.priceTier?.priceWholesale))})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-800">
                            {p.stock} {p.unit}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                              isHabis
                                ? "bg-rose-100 text-rose-700"
                                : isMenipis
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isHabis ? "Habis" : isMenipis ? "Menipis" : "Aman"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Min: {p.minStock} {p.unit}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsModalOpen(true);
                            }}
                            title="Edit Barang"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            title="Hapus Barang"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={editingProduct}
      />
    </div>
  );
}
