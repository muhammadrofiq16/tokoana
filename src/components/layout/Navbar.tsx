import Link from "next/link";
import { Calendar, Plus, Menu } from "lucide-react";
import prisma from "@/lib/prisma";
import NotificationDropdown from "./NotificationDropdown";

interface NavbarProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  onOpenMobileSidebar?: () => void;
}

export default async function Navbar({ user, onOpenMobileSidebar }: NavbarProps) {
  // Format Indonesian date
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);

  // Fetch expiring and low stock products
  let lowStockProducts: Array<{ id: number; name: string; stock: number; minStock: number; unit: string }> = [];
  let expiringProducts: Array<{ id: number; name: string; stock: number; unit: string; expiryDate: Date | null }> = [];

  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [lowStock, expiring] = await Promise.all([
      prisma.product.findMany({
        where: {
          stock: {
            lte: prisma.product.fields.minStock,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          minStock: true,
          unit: true,
        },
        take: 10,
      }),
      prisma.product.findMany({
        where: {
          expiryDate: {
            not: null,
            lte: thirtyDaysFromNow,
          },
        },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: true,
          expiryDate: true,
        },
        orderBy: {
          expiryDate: "asc",
        },
        take: 10,
      }),
    ]);

    lowStockProducts = lowStock;
    expiringProducts = expiring;
  } catch (e) {
    console.error("Error fetching notification products:", e);
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button - toggles sidebar */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Date & Shift Info */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{dateStr}</span>
        </div>

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
