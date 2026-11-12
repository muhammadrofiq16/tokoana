"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      <span>Cetak Struk Thermal</span>
    </button>
  );
}
