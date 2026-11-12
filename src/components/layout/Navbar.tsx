import { Store, Clock, ShieldCheck, User as UserIcon } from "lucide-react";
import prisma from "@/lib/prisma";

interface NavbarProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default async function Navbar({ user }: NavbarProps) {
  let storeName = "Toko Berkah Kelontong";
  let storeStatus = "Buka (Operasional Normal)";
  let workShift = "Shift 1 (Pagi)";

  try {
    const settings = await prisma.setting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));
    if (map.get("store_name")) storeName = map.get("store_name")!;
    if (map.get("store_status")) storeStatus = map.get("store_status")!;
    if (map.get("work_shift")) workShift = map.get("work_shift")!;
  } catch (e) {
    console.error("Could not load settings for Navbar:", e);
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-slate-800 text-sm md:text-base">{storeName}</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          {storeStatus}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{workShift}</span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
