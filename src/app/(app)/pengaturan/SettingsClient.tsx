"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Store, Clock, User, Phone, MapPin, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface SettingsClientProps {
  initialSettings: Record<string, string>;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    store_name: initialSettings.store_name || "Toko Berkah Kelontong",
    store_status: initialSettings.store_status || "Buka (Operasional Normal)",
    cashier_name: initialSettings.cashier_name || "Budi Santoso",
    work_shift: initialSettings.work_shift || "Kasir Shift 1 (Pagi)",
    store_address: initialSettings.store_address || "Jl. Raya Pasar Minggu No. 45, Jakarta Selatan",
    store_phone: initialSettings.store_phone || "0812-9876-5432",
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan pengaturan.");
        setSaving(false);
        return;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Toko & POS</h1>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi nama toko, alamat pada struk, petugas kasir default, dan jam operasional.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan toko berhasil diperbarui! Perubahan akan langsung tampil di navbar dan struk.</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Identitas & Profil Toko</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko *</label>
              <input
                type="text"
                required
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Operasional *</label>
              <select
                value={formData.store_status}
                onChange={(e) => setFormData({ ...formData, store_status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Buka (Operasional Normal)">Buka (Operasional Normal)</option>
                <option value="Tutup Sementara">Tutup Sementara</option>
                <option value="Istirahat / Tutup Shift">Istirahat / Tutup Shift</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petugas Kasir Aktif Default *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.cashier_name}
                    onChange={(e) => setFormData({ ...formData, cashier_name: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Kerja *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.work_shift}
                    onChange={(e) => setFormData({ ...formData, work_shift: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Toko (Dicetak pada Struk)
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3 text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  rows={2}
                  value={formData.store_address}
                  onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. Telepon Toko (Dicetak pada Struk)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={formData.store_phone}
                  onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
