import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      if (s.value !== null) {
        map[s.key] = s.value;
      }
    }
    return NextResponse.json(map);
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: "Gagal mengambil pengaturan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat mengubah pengaturan sistem." }, { status: 403 });
    }

    const body = await req.json();

    const allowedKeys = [
      "store_name",
      "store_status",
      "cashier_name",
      "work_shift",
      "shift",
      "store_address",
      "store_phone",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        });
      }
    }

    if (body.work_shift !== undefined) {
      await prisma.setting.upsert({
        where: { key: "shift" },
        update: { value: String(body.work_shift) },
        create: { key: "shift", value: String(body.work_shift) },
      });
    }

    return NextResponse.json({ success: true, message: "Pengaturan berhasil disimpan." });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
