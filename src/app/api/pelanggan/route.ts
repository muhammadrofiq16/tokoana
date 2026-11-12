import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Fetch customers error:", error);
    return NextResponse.json({ error: "Gagal mengambil data pelanggan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat menambah pelanggan." }, { status: 403 });
    }

    const { name, phone, type = "retail", notes } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Nama pelanggan wajib diisi." }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        type: type === "reseller" ? "reseller" : "retail",
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error("Create customer error:", error);
    return NextResponse.json({ error: error.message || "Gagal menambah pelanggan." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat mengubah pelanggan." }, { status: 403 });
    }

    const { id, name, phone, type, notes } = await req.json();
    const customerId = Number(id);

    if (!customerId || !name) {
      return NextResponse.json({ error: "ID dan nama pelanggan wajib diisi." }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        type: type === "reseller" ? "reseller" : "retail",
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui pelanggan." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat menghapus pelanggan." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "ID pelanggan wajib disertakan." }, { status: 400 });
    }

    await prisma.customer.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pelanggan berhasil dihapus." });
  } catch (error: any) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus pelanggan." }, { status: 500 });
  }
}
