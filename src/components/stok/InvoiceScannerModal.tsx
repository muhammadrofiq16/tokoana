"use client";

import { useState, useRef } from "react";
import {
  X,
  ScanEye,
  ImagePlus,
  Upload,
  Camera,
  Sparkles,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  unit: string;
  stock: number;
}

interface ScannedItem {
  product_name_on_invoice: string;
  matched_product_id: number | null | string;
  matched_product_name?: string | null;
  quantity: number;
  unit: string;
  notes?: string | null;
}

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductOption[];
  onSuccessSave: (count: number, supplier: string) => void;
}

export default function InvoiceScannerModal({
  isOpen,
  onClose,
  products,
  onSuccessSave,
}: InvoiceScannerModalProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "review">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Scanned data state
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetAll = () => {
    setStep("upload");
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setSupplierName("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setScannedItems([]);
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setErrorMessage(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startScan = async () => {
    if (!selectedFile) return;

    setStep("scanning");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/stok/scan-invoice", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(
          json.error || "Gagal memindai gambar faktur. Cek konfigurasi API Gemini."
        );
        setStep("upload");
        return;
      }

      const data = json.data;
      setSupplierName(data.supplier_name || "");
      setInvoiceNumber(data.invoice_number || "");
      setInvoiceDate(data.invoice_date || new Date().toISOString().split("T")[0]);
      setScannedItems(
        (data.items || []).map((item: any) => ({
          product_name_on_invoice: item.product_name_on_invoice || "",
          matched_product_id: item.matched_product_id || "",
          matched_product_name: item.matched_product_name || "",
          quantity: item.quantity || 1,
          unit: item.unit || "Dus",
          notes: item.notes || "",
        }))
      );

      setStep("review");
    } catch (err: any) {
      setErrorMessage("Koneksi gagal saat menghubungi server AI scanner.");
      setStep("upload");
    }
  };

  const addManualRow = () => {
    setScannedItems((prev) => [
      ...prev,
      {
        product_name_on_invoice: "Barang Tambahan",
        matched_product_id: "",
        quantity: 1,
        unit: "Pcs",
        notes: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ScannedItem, value: any) => {
    setScannedItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (!supplierName.trim()) {
      alert("Nama supplier/distributor wajib diisi.");
      return;
    }

    const validItems = scannedItems.filter((i) => Boolean(i.matched_product_id));

    if (validItems.length === 0) {
      alert("Pilih minimal 1 produk toko yang cocok untuk disimpan ke stok.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        supplierName,
        invoiceNumber,
        items: validItems.map((i) => ({
          productId: Number(i.matched_product_id),
          quantity: Number(i.quantity),
          unit: i.unit,
          notes: i.notes || null,
        })),
      };

      const res = await fetch("/api/stok/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal menyimpan batch faktur.");
        setIsSaving(false);
        return;
      }

      onSuccessSave(result.count || validItems.length, supplierName);
      resetAll();
      onClose();
    } catch {
      alert("Terjadi kesalahan koneksi saat menyimpan faktur.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-200">
              <ScanEye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Scan Faktur Otomatis</h3>
              <p className="text-xs text-slate-500 font-medium">
                Upload foto faktur/nota supplier, AI akan membaca &amp; mengisi data otomatis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ====== STEP 1: UPLOAD ====== */}
          {step === "upload" && (
            <div>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  isDragging
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                {previewUrl ? (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      className="max-h-64 mx-auto rounded-xl shadow-lg border border-slate-200 object-contain"
                      alt="Preview Faktur"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
                      <ImagePlus className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        Drag &amp; drop foto faktur di sini
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        atau klik tombol di bawah untuk memilih file
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer bg-white border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="cursor-pointer bg-white border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Buka Kamera</span>
                  </button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                <p className="text-[11px] text-slate-400 mt-3">
                  Format: JPG, PNG, WebP &bull; Maks. 10MB
                </p>
              </div>

              {selectedFile && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={startScan}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2.5 shadow-lg shadow-violet-200 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Mulai Scan dengan AI</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ====== STEP 2: SCANNING ====== */}
          {step === "scanning" && (
            <div className="py-14 text-center">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-violet-50 flex items-center justify-center">
                  <ScanEye className="w-7 h-7 text-violet-600" />
                </div>
              </div>
              <h4 className="text-lg font-bold text-slate-900">AI Sedang Membaca Faktur...</h4>
              <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                Gemini Vision sedang menganalisis teks, tabel, dan struktur faktur Anda. Proses ini
                membutuhkan waktu 2-5 detik.
              </p>
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-150" />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce delay-300" />
              </div>
            </div>
          )}

          {/* ====== STEP 3: REVIEW RESULTS ====== */}
          {step === "review" && (
            <div>
              {/* Invoice Header Info */}
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/60 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1">
                      Supplier / Distributor
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Nama Supplier"
                      className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1">
                      Nomor Faktur
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-00123"
                      className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1">
                      Tanggal Faktur
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full bg-white border border-violet-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Detected Items Count */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">Barang Terdeteksi</h4>
                  <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {scannedItems.length} item
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addManualRow}
                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1.5 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tambah Baris Manual</span>
                </button>
              </div>

              {/* Items Review Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                        <th className="py-3 px-3 text-left w-8">#</th>
                        <th className="py-3 px-3 text-left">Nama di Faktur</th>
                        <th className="py-3 px-3 text-left">Produk Toko (Cocokkan)</th>
                        <th className="py-3 px-3 text-center w-24">Qty</th>
                        <th className="py-3 px-3 text-left w-36">Satuan</th>
                        <th className="py-3 px-3 text-left">Catatan</th>
                        <th className="py-3 px-3 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scannedItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-bold">{index + 1}</td>
                          <td className="py-3 px-3">
                            <span className="text-sm font-medium text-slate-800">
                              {item.product_name_on_invoice}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={item.matched_product_id || ""}
                              onChange={(e) =>
                                updateItem(index, "matched_product_id", e.target.value)
                              }
                              className={`w-full bg-white border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
                                item.matched_product_id
                                  ? "border-emerald-300 text-emerald-800 bg-emerald-50/50"
                                  : "border-amber-300 text-amber-800 bg-amber-50/50"
                              }`}
                            >
                              <option value="">-- Pilih Produk Toko --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", Number(e.target.value))
                              }
                              className="w-20 text-center bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItem(index, "unit", e.target.value)}
                              placeholder="Dus / Pcs"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.notes || ""}
                              onChange={(e) => updateItem(index, "notes", e.target.value)}
                              placeholder="Keterangan..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
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

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Scan Ulang
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-brand-dark hover:bg-brand-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Stok...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Semua Stok Masuk</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
