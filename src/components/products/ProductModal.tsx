"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Layers, AlertCircle, Save } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface UnitForm {
  id?: number;
  unitName: string;
  conversionFactor: number;
  priceRetail: number;
  priceWholesale: number;
  minWholesaleQty: number;
}

interface ProductFormData {
  id?: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  expiryDate: string;
  supplierName: string;
  units: UnitForm[];
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    barcode: "",
    name: "",
    category: "Makanan",
    stock: 0,
    minStock: 5,
    unit: "Pcs",
    costPrice: 0,
    expiryDate: "",
    supplierName: "",
    units: [
      {
        unitName: "Pcs",
        conversionFactor: 1,
        priceRetail: 0,
        priceWholesale: 0,
        minWholesaleQty: 1,
      },
    ],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        sku: initialData.sku || "",
        barcode: initialData.barcode || "",
        name: initialData.name || "",
        category: initialData.category || "Makanan",
        stock: initialData.stock || 0,
        minStock: initialData.minStock || 5,
        unit: initialData.unit || "Pcs",
        costPrice: Number(initialData.costPrice) || 0,
        expiryDate: initialData.expiryDate ? initialData.expiryDate.split("T")[0] : "",
        supplierName: initialData.supplierName || "",
        units: initialData.units?.map((u: any) => ({
          id: u.id,
          unitName: u.unitName,
          conversionFactor: u.conversionFactor,
          priceRetail: Number(u.priceTier?.priceRetail) || 0,
          priceWholesale: Number(u.priceTier?.priceWholesale) || 0,
          minWholesaleQty: u.priceTier?.minWholesaleQty || 1,
        })) || [
          {
            unitName: initialData.unit || "Pcs",
            conversionFactor: 1,
            priceRetail: 0,
            priceWholesale: 0,
            minWholesaleQty: 1,
          },
        ],
      });
    } else {
      // Default empty form
      const randomSku = `BRG-${Math.floor(100 + Math.random() * 900)}`;
      setFormData({
        sku: randomSku,
        barcode: "",
        name: "",
        category: "Makanan",
        stock: 0,
        minStock: 5,
        unit: "Pcs",
        costPrice: 0,
        expiryDate: "",
        supplierName: "",
        units: [
          {
            unitName: "Pcs",
            conversionFactor: 1,
            priceRetail: 0,
            priceWholesale: 0,
            minWholesaleQty: 1,
          },
        ],
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleBaseUnitChange = (name: string) => {
    setFormData((prev) => {
      const nextUnits = [...prev.units];
      if (nextUnits.length > 0) {
        nextUnits[0].unitName = name;
      }
      return { ...prev, unit: name, units: nextUnits };
    });
  };

  const addPackagingUnit = () => {
    setFormData((prev) => ({
      ...prev,
      units: [
        ...prev.units,
        {
          unitName: "Dus",
          conversionFactor: 12,
          priceRetail: 0,
          priceWholesale: 0,
          minWholesaleQty: 1,
        },
      ],
    }));
  };

  const removeUnit = (index: number) => {
    if (index === 0) return; // Cannot delete base unit
    setFormData((prev) => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index),
    }));
  };

  const updateUnitField = (index: number, field: keyof UnitForm, value: any) => {
    setFormData((prev) => {
      const nextUnits = [...prev.units];
      nextUnits[index] = { ...nextUnits[index], [field]: value };
      return { ...prev, units: nextUnits };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = formData.id ? `/api/products/${formData.id}` : "/api/products";
      const method = formData.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal menyimpan data barang.");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">
              {formData.id ? "Edit Data Barang" : "Tambah Barang Baru"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola informasi produk, barcode, dan harga multi-satuan bertingkat.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Informasi Pokok Barang
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SKU / Kode Barang *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="BRG-001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Barcode (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="899277511201"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Produk / Barang *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Indomie Mi Goreng 85g"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori *</label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Makanan, Minuman, Sembako..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan Dasar (Base Unit) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) => handleBaseUnitChange(e.target.value)}
                  placeholder="Pcs, Bungkus, Botol..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stok Saat Ini *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batas Minimal *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Harga Modal Pokok (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Suplier</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="PT Indomarco / Suplier..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Kadaluwarsa</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Multi-Satuan & Pricing Tier Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Multi-Satuan & Harga Bertingkat</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tentukan harga eceran, grosir, dan kemasan besar (Dus/Pak).
                </p>
              </div>

              <button
                type="button"
                onClick={addPackagingUnit}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Satuan Kemasan</span>
              </button>
            </div>

            <div className="space-y-3">
              {formData.units.map((unitItem, index) => {
                const isBase = index === 0;
                return (
                  <div
                    key={index}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        {isBase ? "Satuan Dasar (Terkecil)" : `Satuan Kemasan Ke-${index}`}
                      </span>

                      {!isBase && (
                        <button
                          type="button"
                          onClick={() => removeUnit(index)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Nama Satuan (misal: {isBase ? "Bungkus/Pcs" : "Dus/Pak/Slop"})
                        </label>
                        <input
                          type="text"
                          required
                          value={unitItem.unitName}
                          onChange={(e) => updateUnitField(index, "unitName", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Konversi ke Satuan Dasar (Isi per {unitItem.unitName})
                        </label>
                        <input
                          type="number"
                          min="1"
                          disabled={isBase}
                          value={unitItem.conversionFactor}
                          onChange={(e) =>
                            updateUnitField(index, "conversionFactor", parseInt(e.target.value) || 1)
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Harga Jual Retail (Rp) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={unitItem.priceRetail}
                          onChange={(e) =>
                            updateUnitField(index, "priceRetail", parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Harga Grosir / Reseller (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={unitItem.priceWholesale}
                          onChange={(e) =>
                            updateUnitField(index, "priceWholesale", parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-black text-amber-600 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Min. Qty Grosir
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={unitItem.minWholesaleQty}
                          onChange={(e) =>
                            updateUnitField(index, "minWholesaleQty", parseInt(e.target.value) || 1)
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Data Barang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
