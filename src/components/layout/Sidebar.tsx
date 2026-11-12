"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  PackagePlus,
  Package,
  Users,
  Receipt,
  Settings,
  UserCog,
  LogOut,
  Store,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const isAdmin = user.role === "admin";

  const mainNav = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Kasir POS",
      href: "/kasir",
      icon: ShoppingCart,
      active: pathname.startsWith("/kasir"),
      badge: "Utama",
    },
    {
      label: "Stok Masuk",
      href: "/stok",
      icon: PackagePlus,
      active: pathname.startsWith("/stok"),
    },
  ];

  const masterNav = [
    {
      label: "Data Barang",
      href: "/products",
      icon: Package,
      active: pathname.startsWith("/products"),
    },
    {
      label: "Pelanggan",
      href: "/pelanggan",
      icon: Users,
      active: pathname.startsWith("/pelanggan"),
    },
  ];

  const reportNav = [
    {
      label: "Transaksi & Laporan",
      href: "/transaksi",
      icon: Receipt,
      active: pathname.startsWith("/transaksi") || pathname.startsWith("/laporan"),
    },
  ];

  const systemNav = [
    {
      label: "Pengaturan Toko",
      href: "/pengaturan",
      icon: Settings,
      active: pathname.startsWith("/pengaturan"),
    },
    {
      label: "Manajemen Pengguna",
      href: "/pengguna",
      icon: UserCog,
      active: pathname.startsWith("/pengguna"),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight tracking-tight">Toko Ana</h1>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistem POS Retail
          </p>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Group */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Kasir & Utama
          </div>
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                    item.active
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", item.active ? "text-white" : "text-slate-400 group-hover:text-emerald-400")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Master Data (Admin Only) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Master Data
            </div>
            <nav className="space-y-1">
              {masterNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      item.active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", item.active ? "text-white" : "text-slate-400 group-hover:text-emerald-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Finance & Reports (Admin Only) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Keuangan & Laporan
            </div>
            <nav className="space-y-1">
              {reportNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      item.active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", item.active ? "text-white" : "text-slate-400 group-hover:text-emerald-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* System Settings & Users (Admin Only) */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sistem
            </div>
            <nav className="space-y-1">
              {systemNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      item.active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", item.active ? "text-white" : "text-slate-400 group-hover:text-emerald-400")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.2 rounded-md uppercase tracking-wider",
                isAdmin ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              )}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar dari sistem"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
