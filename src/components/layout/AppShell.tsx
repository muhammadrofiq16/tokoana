"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

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

interface AppShellProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  lowStockProducts?: LowStockItem[];
  expiringProducts?: ExpiringItem[];
  children: React.ReactNode;
}

export default function AppShell({
  user,
  lowStockProducts = [],
  expiringProducts = [],
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <Sidebar
        user={user}
        isOpenMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Proper sticky Navbar — no longer a floating fixed button */}
        <Navbar
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          lowStockProducts={lowStockProducts}
          expiringProducts={expiringProducts}
        />
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
