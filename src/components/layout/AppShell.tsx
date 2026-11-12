"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

interface AppShellProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      <Sidebar
        user={user}
        isOpenMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile quick header button if needed, handled inside Navbar or here */}
        <div className="lg:hidden fixed top-3.5 left-4 z-40">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg shadow-xs hover:bg-slate-50"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
