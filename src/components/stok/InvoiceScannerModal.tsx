"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Plus,
  Save,
  Building,
  Hash,
} from "lucide-react";
import type { ScannedItem } from "@/lib/gemini-scanner";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  unit: string;
  stock: number;
}

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalogProducts: ProductOption[];
}

export default function InvoiceScannerModal({
  isOpen,
  onClose,
  onSuccess,
  catalogProducts,
}: InvoiceScannerModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted Data State
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanDone, setScanDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setError(null);
      setScanDone(false);
      setItems([]);
    }
  };

  const handleStartScan = async () => {
    if (!file) {
      setError("Silakan pilih gambar faktur terlebih dahulu.");
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("invoice_image", file);

      const res = await fetch("/api/stok/scan-invoice", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Gagal memproses faktur dengan AI.");
        setScanning(false);
        return;
      }

      setSupplierName(json.data.supplier_name || "");
      setInvoiceNumber(json.data.invoice_number || "");
      setItems(json.data.items || []);
      setScanDone(true);
    } catch {
      setError("Terjadi kesalahan jaringan saat memproses faktur.");
    } finally {
      setScanning(false);
    }
  };

  const updateItem = (index: number, field: keyof ScannedItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // If matched_product_id changed, auto update product name & unit
      if (field === "matched_product_id") {
        const prod = catalogProducts.find((p) => p.id === Number(value));
        if (prod) {
          next[index].matched_product_name = prod.name;
          next[index].matched_product_sku = prod.sku;
          next[index].matched_product_stock = prod.stock;
          next[index].unit = prod.unit;
        }
      }

      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const firstProduct = catalogProducts[0];
    setItems((prev) => [
      ...prev,
      {
        product_name_on_invoice: "Barang Baru",
        matched_product_id: firstProduct?.id || null,
        matched_product_name: firstProduct?.name || null,
        matched_product_sku: firstProduct?.sku || null,
        matched_product_stock: firstProduct?.stock || 0,
        quantity: 1,
        unit: firstProduct?.unit || "Pcs",
        notes: null,
      },
    ]);
  };

  const handleSaveBatch = async () => {
    if (!supplierName.trim()) {
      setError("Nama suplier wajib diisi.");
      return;
    }

    const validItems = items.filter((i) => i.matched_product_id && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Minimal ada 1 barang yang dicocokkan dengan katalog produk toko.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/stok/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          invoiceNumber,
          items: validItems.map((i) => ({
            productId: i.matched_product_id,
            quantity: i.quantity,
            unit: i.unit,
            notes: i.notes || i.product_name_on_invoice,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan stok faktur.");
        setSaving(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan saat menyimpan batch.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">
                AI Scanner Faktur & Surat Jalan Distributor
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Ekstrak otomatis daftar barang, suplier, dan stok masuk dengan Google Gemini Vision AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Upload or Preview Image */}
          {!scanDone && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-10 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">
                    Klik untuk Unggah atau Foto Faktur / Nota
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Mendukung format JPG, PNG, atau WebP (Maksimal 10MB)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                  <div className="w-36 h-36 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
                    <img
                      src={previewUrl}
                      alt="Faktur Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Foto Faktur Terpilih ({file?.name})
                    </h4>
                    <p className="text-xs text-slate-500">
                      AI akan membaca teks, distributor, nomor faktur, dan mencocokkan nama produk dengan katalog toko.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleStartScan}
                        disabled={scanning}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {scanning ? (
                          <>
                            <span className="inline-block animate-spin mr-1">⏳</span>
                            <span>Menganalisis Gambar dengan Gemini AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Mulai Analisis Faktur</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={scanning}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Review AI Extracted Data */}
          {scanDone && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    Faktur berhasil diekstrak! Silakan tinjau dan sesuaikan kecocokan barang sebelum disimpan.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setScanDone(false);
                    setPreviewUrl(null);
                    setFile(null);
                  }}
                  className="text-emerald-700 hover:underline font-bold text-[11px]"
                >
                  Scan Ulang
                </button>
              </div>

              {/* Distributor & Invoice Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nama Distributor / Suplier *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="PT Indomarco / Suplier..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nomor Faktur / Surat Jalan</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV/2026/001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wide">
                    Daftar Barang Terdeteksi ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-slate-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Baris</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Teks Nota / Faktur</th>
                        <th className="px-4 py-3">Cocokkan dengan Katalog Toko *</th>
                        <th className="px-4 py-3 w-24">Jumlah</th>
                        <th className="px-4 py-3 w-28">Satuan</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.product_name_on_invoice}
                              onChange={(e) =>
                                updateItem(index, "product_name_on_invoice", e.target.value)
                              }
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-medium"
                            />
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Catatan: {item.notes}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={item.matched_product_id || ""}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "matched_product_id",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold focus:outline-hidden ${
                                item.matched_product_id
                                  ? "border-emerald-300 bg-emerald-50/30 text-emerald-900"
                                  : "border-amber-300 bg-amber-50/40 text-amber-900"
                              }`}
                            >
                              <option value="">-- Belum Cocok / Pilih Produk --</option>
                              {catalogProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) - Sisa: {p.stock} {p.unit}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", parseInt(e.target.value) || 1)
                              }
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-black text-center"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItem(index, "unit", e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-medium"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {scanDone && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Barang yang sudah dicocokkan akan langsung menambah stok fisik produk.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving || items.length === 0}
                onClick={handleSaveBatch}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <span>Menyimpan ke Stok...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Semua ke Stok Masuk</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
