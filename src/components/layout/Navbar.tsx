"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";

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
  expiryDate: string | null;
}

interface NavbarProps {
  onOpenMobileSidebar: () => void;
  lowStockProducts: LowStockItem[];
  expiringProducts: ExpiringItem[];
}

export default function Navbar({
  onOpenMobileSidebar,
  lowStockProducts,
  expiringProducts,
}: NavbarProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button — toggles sidebar */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Primary Action Button: + Catat Stok */}
        <Link
          href="/stok"
          className="bg-brand-dark hover:bg-brand-800 text-white font-semibold text-sm px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">Catat Stok</span>
        </Link>

        {/* Notification Bell Dropdown */}
        <NotificationDropdown
          lowStockProducts={lowStockProducts}
          expiringProducts={expiringProducts}
        />
      </div>
    </header>
  );
}
