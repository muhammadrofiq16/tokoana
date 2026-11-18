"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, PackageX, CalendarClock, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
}

interface ExpiringItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
  expiryDate: Date | string | null;
}

interface NotificationDropdownProps {
  lowStockProducts: LowStockItem[];
  expiringProducts: ExpiringItem[];
}

export default function NotificationDropdown({
  lowStockProducts,
  expiringProducts,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalNotifCount = lowStockProducts.length + expiringProducts.length;
  const hasNotifications = totalNotifCount > 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
        aria-label="Notifikasi Stok"
      >
        <Bell className="w-5 h-5" />
        {hasNotifications && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black ring-2 ring-white px-1">
            {totalNotifCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">Notifikasi</h4>
            {hasNotifications && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {totalNotifCount} Peringatan
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {hasNotifications ? (
              <>
                {/* Low Stock Section */}
                {lowStockProducts.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100">
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                        <PackageX className="w-3 h-3" />
                        Stok Menipis ({lowStockProducts.length})
                      </span>
                    </div>
                    {lowStockProducts.map((item) => (
                      <Link
                        key={item.id}
                        href="/stok"
                        onClick={() => setOpen(false)}
                        className="p-3 border-b border-slate-50 hover:bg-slate-50 flex items-start gap-3 transition-colors block"
                      >
                        <div
                          className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                            item.stock <= 0
                              ? "text-red-500 bg-red-50"
                              : "text-amber-500 bg-amber-50"
                          }`}
                        >
                          <PackageX className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p
                            className={`text-[11px] font-medium mt-0.5 ${
                              item.stock <= 0 ? "text-red-600" : "text-amber-700"
                            }`}
                          >
                            {item.stock <= 0
                              ? "STOK HABIS"
                              : "Stok menipis — perlu restock"}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Sisa: {item.stock} {item.unit} (min: {item.minStock})
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {/* Expiring Products Section */}
                {expiringProducts.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-rose-50/70 border-b border-rose-100">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        Hampir/Sudah Kadaluarsa ({expiringProducts.length})
                      </span>
                    </div>
                    {expiringProducts.map((item) => {
                      const isExpired = item.expiryDate
                        ? new Date(item.expiryDate) < new Date()
                        : false;
                      const dateFormatted = item.expiryDate
                        ? new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(item.expiryDate))
                        : "-";

                      return (
                        <Link
                          key={item.id}
                          href="/products"
                          onClick={() => setOpen(false)}
                          className="p-3 border-b border-slate-50 hover:bg-slate-50 flex items-start gap-3 transition-colors block"
                        >
                          <div
                            className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                              isExpired
                                ? "text-red-500 bg-red-50"
                                : "text-amber-500 bg-amber-50"
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{item.name}</p>
                            <p
                              className={`text-[11px] font-medium mt-0.5 ${
                                isExpired ? "text-red-600" : "text-amber-700"
                              }`}
                            >
                              {isExpired ? "Kadaluarsa pada" : "Akan kadaluarsa pada"}{" "}
                              {dateFormatted}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Sisa stok: {item.stock} {item.unit}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-xs font-medium">
                  Semua stok aman, tidak ada peringatan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
