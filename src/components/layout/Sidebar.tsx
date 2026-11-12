"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Monitor,
  Users,
  Receipt,
  LayoutGrid,
  Boxes,
  PackageSearch,
  PackagePlus,
  UserCog,
  Sliders,
  LogOut,
  Store,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  storeName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  user,
  storeName = "Toko Ana",
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "admin";

  const isBarangOrStokActive =
    pathname.startsWith("/products") || pathname.startsWith("/stok");
  const [openBarangMenu, setOpenBarangMenu] = useState(isBarangOrStokActive);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 h-screen overflow-y-auto",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-700 font-bold text-xl shrink-0">
                <Store className="w-5 h-5 text-brand-700" />
              </div>
              <div className="overflow-hidden min-w-0">
                <h1
                  className="font-extrabold text-base text-slate-900 leading-tight tracking-tight truncate"
                  title={storeName}
                >
                  {storeName}
                </h1>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  Inventaris &amp; Kasir
                </p>
              </div>
            </div>

            {/* Close Sidebar Button (Mobile) */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-lg shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* MENU UTAMA Section */}
          <div className="mb-2">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3">
              MENU UTAMA
            </span>
          </div>

          <nav className="space-y-0.5">
            {/* Kasir POS */}
            <Link
              href="/kasir"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                pathname.startsWith("/kasir")
                  ? "bg-brand-100/70 text-brand-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Monitor
                className={cn(
                  "w-4.5 h-4.5",
                  pathname.startsWith("/kasir") ? "text-brand-700" : "text-slate-400"
                )}
              />
              <span>Kasir POS</span>
            </Link>

            {isAdmin && (
              <>
                {/* Pelanggan & Suplier */}
                <Link
                  href="/pelanggan"
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    pathname.startsWith("/pelanggan")
                      ? "bg-brand-100/70 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Users
                    className={cn(
                      "w-4.5 h-4.5",
                      pathname.startsWith("/pelanggan")
                        ? "text-brand-700"
                        : "text-slate-400"
                    )}
                  />
                  <span>Pelanggan &amp; Suplier</span>
                </Link>

                {/* Riwayat Transaksi */}
                <Link
                  href="/transaksi"
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    pathname.startsWith("/transaksi") || pathname.startsWith("/laporan")
                      ? "bg-brand-100/70 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Receipt
                    className={cn(
                      "w-4.5 h-4.5",
                      pathname.startsWith("/transaksi") || pathname.startsWith("/laporan")
                        ? "text-brand-700"
                        : "text-slate-400"
                    )}
                  />
                  <span>Riwayat Transaksi</span>
                </Link>
              </>
            )}

            {/* DATA & KELOLA Section */}
            <div className="pt-2 pb-1">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3">
                DATA &amp; KELOLA
              </span>
            </div>

            {/* Dashboard */}
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                pathname === "/dashboard"
                  ? "bg-brand-100/70 text-brand-800"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <LayoutGrid
                className={cn(
                  "w-4.5 h-4.5",
                  pathname === "/dashboard" ? "text-brand-700" : "text-slate-400"
                )}
              />
              <span>Dashboard</span>
            </Link>

            {isAdmin ? (
              /* Inventaris & Stok Accordion Menu */
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setOpenBarangMenu(!openBarangMenu)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    isBarangOrStokActive
                      ? "bg-brand-100/70 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Boxes
                      className={cn(
                        "w-4.5 h-4.5",
                        isBarangOrStokActive ? "text-brand-700" : "text-slate-400"
                      )}
                    />
                    <span>Inventaris &amp; Stok</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-slate-400 transition-transform duration-200",
                      openBarangMenu && "rotate-180"
                    )}
                  />
                </button>

                {openBarangMenu && (
                  <div className="pl-4 pr-1 py-1 space-y-1">
                    {/* 1. Master Data Barang */}
                    <Link
                      href="/products"
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        pathname.startsWith("/products")
                          ? "bg-brand-50 text-brand-800 font-bold border-l-2 border-brand-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <PackageSearch
                          className={cn(
                            "w-3.5 h-3.5",
                            pathname.startsWith("/products")
                              ? "text-brand-700"
                              : "text-slate-400"
                          )}
                        />
                        <span>Master Data Barang</span>
                      </div>
                    </Link>

                    {/* 2. Catat Stok Masuk */}
                    <Link
                      href="/stok"
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        pathname.startsWith("/stok")
                          ? "bg-brand-50 text-brand-800 font-bold border-l-2 border-brand-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <PackagePlus
                          className={cn(
                            "w-3.5 h-3.5",
                            pathname.startsWith("/stok")
                              ? "text-brand-700"
                              : "text-slate-400"
                          )}
                        />
                        <span>Catat Stok Masuk</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* Kasir Only: Catat Stok Masuk */
              <Link
                href="/stok"
                onClick={onCloseMobile}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                  pathname.startsWith("/stok")
                    ? "bg-brand-100/70 text-brand-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <PackagePlus
                  className={cn(
                    "w-4.5 h-4.5",
                    pathname.startsWith("/stok") ? "text-brand-700" : "text-slate-400"
                  )}
                />
                <span>Catat Stok Masuk</span>
              </Link>
            )}

            {isAdmin && (
              <>
                {/* Manajemen Akun */}
                <Link
                  href="/pengguna"
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    pathname.startsWith("/pengguna")
                      ? "bg-brand-100/70 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <UserCog
                    className={cn(
                      "w-4.5 h-4.5",
                      pathname.startsWith("/pengguna")
                        ? "text-brand-700"
                        : "text-slate-400"
                    )}
                  />
                  <span>Manajemen Akun</span>
                </Link>

                {/* Pengaturan Toko */}
                <Link
                  href="/pengaturan"
                  onClick={onCloseMobile}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    pathname.startsWith("/pengaturan")
                      ? "bg-brand-100/70 text-brand-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Sliders
                    className={cn(
                      "w-4.5 h-4.5",
                      pathname.startsWith("/pengaturan")
                        ? "text-brand-700"
                        : "text-slate-400"
                    )}
                  />
                  <span>Pengaturan</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Bottom Profile Section */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* Toko Status Pill */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold gap-2">
            <div className="flex items-center gap-2 text-slate-700 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
              <span className="truncate font-medium">{storeName}</span>
            </div>
            <span className="text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200 shrink-0 text-[11px]">
              Buka
            </span>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-800 border border-brand-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full",
                      isAdmin ? "bg-indigo-500" : "bg-emerald-500"
                    )}
                  />
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider",
                      isAdmin ? "text-indigo-600" : "text-emerald-600"
                    )}
                  >
                    {isAdmin ? "Admin Toko" : "Kasir POS"}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar / Ganti Shift"
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
